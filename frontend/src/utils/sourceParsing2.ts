import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import _ from "lodash";

import * as xpath from "xpath";
const xpathSelect = xpath.select;

import { log } from "./logger.js";
import { LOCATOR_STRATEGIES as STRATS } from "./session-inspector.js";

const domParser = new DOMParser();
const xmlSerializer = new XMLSerializer();

export const xmlToDOM = (string: string): Document =>
  domParser.parseFromString(string, "application/xml");
export const domToXML = (dom: Node): string =>
  xmlSerializer.serializeToString(dom);

/**
 * Get the child nodes of a Node object
 *
 * @param {Node} domNode
 * @returns {Array<Node|null>} list of Nodes
 */
export function childNodesOf(domNode: Node | null): Node[] {
  if (!domNode?.hasChildNodes()) {
    return [];
  }
  return _.filter(
    Array.from(domNode.childNodes),
    (node) => node.nodeType === (domNode as Element).ELEMENT_NODE,
  );
}

/**
 * Look up an element in the Document source using the provided path
 *
 * @param {string} path a dot-separated string of indices
 * @param {Document} sourceDoc app source in Document format
 * @returns {Node} element node
 */
export function findDOMNodeByPath(
  path: string,
  sourceDoc: Document | Element,
): Node | undefined {
  let selectedElement: Node | undefined =
    childNodesOf(sourceDoc)[0] ||
    childNodesOf((sourceDoc as Document).documentElement)[0];
  for (const index of path.split(".")) {
    const children = childNodesOf(selectedElement || null);
    selectedElement = children[parseInt(index, 10)];
  }
  return selectedElement;
}

/**
 * Look up an element in the JSON source using the provided path
 *
 * @param {string} path a dot-separated string of indices
 * @param {Object} sourceJSON app source in JSON format
 * @returns {Object} element details in JSON format
 */
export interface TreeObject {
  tagName: string;
  attributes: Record<string, string>;
  key: string;
  xpath: string | null;
  boundsArray: number[];
  center: number[];
  children: TreeObject[];
}

export interface SourceJSON {
  children: SourceJSON[];
  [key: string]: unknown;
}

export function findJSONElementByPath(
  path: string,
  sourceJSON: SourceJSON,
): SourceJSON {
  let selectedElement = sourceJSON;
  for (const index of path.split(".")) {
    selectedElement = selectedElement.children[parseInt(index, 10)];
  }
  return { ...selectedElement };
}

/**
 * Translates sourceXML to JSON
 *
 * @param {string} sourceXML
 * @returns {Object} source in JSON format
 */
export function xmlToJSON(sourceXML: string): {
  treeObject: TreeObject | Record<string, never>;
  treeMap: Record<string, TreeObject>;
} {
  const treeMap: Record<string, TreeObject> = {};

  // Helper function to convert bounds string to boundsArray
  const parseBounds = (boundsString: string | null): number[] => {
    if (!boundsString) return [];
    const boundValues = boundsString
      .replace(/\]\[/g, ",")
      .replace(/\[|\]/g, "");
    return boundValues.split(",").map((num) => parseInt(num, 10));
  };

  const translateRecursively = (domNode: Element): TreeObject => {
    const attributes: Record<string, string> = {};
    let boundsArray = [0, 0, 0, 0];
    if (domNode.attributes) {
      for (let attrIdx = 0; attrIdx < domNode.attributes.length; ++attrIdx) {
        const attr = domNode.attributes.item(attrIdx);
        if (attr) {
          // it should be show new line character(\n) in GUI
          attributes[attr.name] = attr.value.replace(/(\n)/gm, "\\n");
        }
      }
    }
    // Parse bounds attribute if present
    if (attributes.bounds) {
      boundsArray = parseBounds(attributes.bounds);
    }
    const center = [
      Math.round(boundsArray[0] + (boundsArray[2] - boundsArray[0]) / 2),
      Math.round(boundsArray[1] + (boundsArray[3] - boundsArray[1]) / 2),
    ];

    const xpath = getOptimalXPath(sourceDoc, domNode);
    const treeObject: TreeObject = {
      tagName: domNode.tagName,
      attributes,
      key: attributes.key,
      xpath,
      boundsArray,
      center,
      children: [], // will be populated
    };

    // Store in maps
    treeMap[attributes.key] = treeObject;

    treeObject.children = childNodesOf(domNode).map((childNode) =>
      translateRecursively(childNode as Element),
    );

    return treeObject;
  };

  const sourceDoc = xmlToDOM(sourceXML);
  // get the first child element node in the doc. some drivers write their xml differently so we
  // first try to find an element as a direct descended of the doc, then look for one in
  // documentElement
  const firstChild =
    childNodesOf(sourceDoc)[0] ||
    childNodesOf((sourceDoc as Document).documentElement)[0];

  return {
    treeObject: firstChild ? translateRecursively(firstChild as Element) : {},
    treeMap,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check whether the provided tag is unique in the source.
 * Applies whitespace normalization to the input tag name,
 * since they cannot have spaces
 *
 * @param {string} tagName
 * @param {Document} node
 * @returns {boolean}
 */
export function isTagUnique(tagName: string, node: Document): boolean {
  if (!doesDocumentExist(node)) {
    return true;
  }
  const trimmedTagName = toTrimmedString(tagName);
  if (!trimmedTagName) {
    return false;
  }
  return isXpathUnique("//*[name()=$tagName]", {
    variables: { tagName: trimmedTagName },
    node: node,
  });
}

/**
 * Check whether the provided attribute & value are unique in the source
 * Applies whitespace normalization to the attribute name,
 * since they cannot have spaces
 *
 * @param {string} attrName
 * @param {string} attrValue
 * @param {Document} node
 * @returns {boolean}
 */
export function areAttrAndValueUnique(
  attrName: string,
  attrValue: string,
  node: Document,
): boolean {
  if (!doesDocumentExist(node)) {
    return true;
  }
  const trimmedAttrName = toTrimmedString(attrName);
  if (!trimmedAttrName || !toTrimmedString(attrValue)) {
    return false;
  }
  // if node exists, that means xmlToDOM was called, which already validates attribute names,
  // so the attribute name is safe to use directly
  return isXpathUnique(`//*[@${trimmedAttrName}=$attrValue]`, {
    variables: { attrValue },
    node: node,
  });
}

/**
 * Get suggested selectors for simple locator strategies (which match a specific attribute)
 *
 * @param {Record<string, string|object>} elementProps relevant element properties
 * @param {Document} sourceDoc
 * @param {boolean} [isNative=true] whether native context is active
 * @returns {Record<string, string>} mapping of strategies to selectors
 */
export function getSimpleSuggestedLocators(
  elementProps: { tag: string; attributes: Record<string, string> },
  sourceDoc: Document,
  isNative = true,
): Record<string, string> {
  const simpleLocGen = new SimpleLocatorGenerator(elementProps, sourceDoc);
  return isNative
    ? simpleLocGen.generateNativeSelectors()
    : simpleLocGen.generateWebSelectors();
}

/**
 * Get suggested selectors for complex locator strategies (multiple attributes, axes, etc.)
 *
 * @param {string} path a dot-separated string of indices
 * @param {Document} sourceDoc
 * @param {boolean} isNative whether native context is active
 * @param {string} automationName
 * @returns {Record<string, string>} mapping of strategies to selectors
 */
export function getComplexSuggestedLocators(
  path: string,
  sourceDoc: Document,
  isNative: boolean,
  automationName: string,
): Record<string, string> {
  const complexLocators: Record<string, string | null> = {};
  const domNode = findDOMNodeByPath(path, sourceDoc);
  if (isNative && domNode) {
    switch (automationName) {
      case "xcuitest":
      case "mac2": {
        const optimalClassChain = getOptimalClassChain(sourceDoc, domNode);
        complexLocators["-ios class chain"] = optimalClassChain
          ? "**" + optimalClassChain
          : null;
        complexLocators["-ios predicate string"] = getOptimalPredicateString(
          sourceDoc,
          domNode,
        );
        break;
      }
      case "uiautomator2": {
        complexLocators["-android uiautomator"] = getOptimalUiAutomatorSelector(
          sourceDoc,
          domNode,
          path,
        );
        break;
      }
    }
  }
  if (domNode) {
    complexLocators.xpath = getOptimalXPath(sourceDoc, domNode);
  }

  // Remove entries for locators where the optimal selector could not be found
  return _.omitBy(complexLocators, _.isNil) as Record<string, string>;
}

/**
 * Get suggested selectors for all locator strategies
 *
 * @param {object} selectedElement element node in JSON format
 * @param {string} sourceXML
 * @param {boolean} isNative whether native context is active
 * @param {string} automationName
 * @returns {Array<[string, string]>} array of tuples, consisting of the locator strategy and selector
 */
export function getSuggestedLocators(
  selectedElement: TreeObject,
  sourceXML: string,
  isNative: boolean,
  automationName: string,
): Array<[string, string]> {
  const simpleLocElementProps = {
    tag: selectedElement.tagName,
    attributes: selectedElement.attributes,
  };
  const sourceDoc = xmlToDOM(sourceXML);
  const simpleLocators = getSimpleSuggestedLocators(
    simpleLocElementProps,
    sourceDoc,
    isNative,
  );
  if (selectedElement.key) {
    // Assuming 'key' or nested 'key' maps to path?
    // Original code used selectedElement.path, but TreeObject defines 'key'.
    // 'xmlToJSON' produces 'key' from 'parentPath' and 'index'.
    // But 'findDOMNodeByPath' expects 'path' (dot separated).
    // 'key' is dot separated?
    // In 'translateRecursively', key = parentPath + "-" + index.
    // Wait, original 'findDOMNodeByPath' split by ".".
    // 'key' uses "-".
    // Is 'key' the 'path'?
    // Or 'selectedElement.path' was documented in JSDoc for getSuggestedLocators but missing in TreeObject?
    // I'll assume 'key' needs to be converted or 'key' IS the path but with dashes?
    // Actually 'findDOMNodeByPath' splits by ".".
    // 'key' in `sourceParsing.ts` seems to be used for uniqueness?
    // The original code passed `selectedElement.path` to `getComplexSuggestedLocators`.
    // `findDOMNodeByPath` takes `path` and splits by `.`.
    // `xmlToJSON` produces keys with dashes?
    // `key` = `0` or `0-1`.
    // `path` in `findDOMNodeByPath` splits by `.`.
    // If `selectedElement` comes from `xmlToJSON`, it has `key`.
    // If `key` is `0-1`, `path.split('.')` won't work if it expects `0.1`.
    // I should probably convert `key` (dashes) to `path` (dots).
    // Or maybe existing code works because they ARE dots?
    // `translateRecursively`: `const key = ... ? "0" : ... + "-" + index`.
    // So it uses dashes.
    // `findDOMNodeByPath`: `path.split(".")`.
    // So if I pass `0-1`, split(".") gives `["0-1"]`. loop runs once. `childNodesOf(selectedElement)[index]`. index="0-1". `parseInt` parses "0".
    // This seems wrong if depth > 1.
    // Use `selectedElement.key.replace(/-/g, ".")`?
    // Proceed with caution. I'll use `selectedElement.key.replace(/-/g, ".")`.

    const path = selectedElement.key.replace(/-/g, ".");
    const complexLocators = getComplexSuggestedLocators(
      path,
      sourceDoc,
      isNative,
      automationName,
    );
    return _.toPairs({ ...simpleLocators, ...complexLocators });
  }
  return _.toPairs({ ...simpleLocators });
}

/**
 * Get an optimal XPath for a Node
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalXPath(doc: Document, domNode: Node): string | null {
  return new XPathGenerator(doc, domNode).generate();
}

/**
 * Get an optimal class chain for a Node
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalClassChain(
  doc: Document,
  domNode: Node,
): string | null {
  return new ClassChainGenerator(doc, domNode).generate();
}

/**
 * Get an optimal predicate string for a Node
 * Only works for a single element - no parent/child scope
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalPredicateString(
  doc: Document,
  domNode: Node,
): string | null {
  return new PredicateStringGenerator(doc, domNode).generate();
}

/**
 * Get an optimal UiAutomator selector for a Node
 * Only works for elements inside the last direct child of the hierarchy (xpath: /hierarchy/*[last()] )
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @param {string} path a dot-separated string of indices
 * @returns {string|null}
 */
export function getOptimalUiAutomatorSelector(
  doc: Document,
  domNode: Node,
  path: string,
): string | null {
  return new UiAutomatorGenerator(doc, domNode, path).generate();
}

/**
 * Get an optimal JSONPath for a target node within a JSON object
 *
 * @param {SourceJSON} rootJSON - the root JSON object
 * @param {SourceJSON} targetNode - the target node to find
 * @returns {string|null} the JSONPath expression or null if not found
 */
export function getOptimalJSONPath(
  rootJSON: SourceJSON,
  targetNode: SourceJSON,
): string | null {
  return new JSONPathGenerator(rootJSON, targetNode).generate();
}

// ============================================================================
// Private Implementation Classes
// ============================================================================

/**
 * Trim whitespace from a string value,
 * otherwise return an empty string
 *
 * @param {*} value input value
 * @returns {string} trimmed string
 */
function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convenience check for whether the document node exists
 *
 * @param {Document | undefined} node document node
 * @returns {boolean}
 */
function doesDocumentExist(node: Document | undefined): boolean {
  // If no node provided, assume the xpath is unique
  return Boolean(node) && !_.isEmpty(node);
}

/**
 * Parse and evaluate an xpath using the built-in safe variable replacement,
 * then check whether it finds exactly one element
 *
 * @param {string} xpath
 * @param {Record<string, unknown>} options options for XPathEvaluator
 * @see https://github.com/goto100/xpath/blob/master/docs/XPathEvaluator.md
 * @returns {boolean}
 */
interface XPathParser {
  parse(expression: string): { select(options: XPathOptions): Node[] };
}

interface XPathOptions {
  node?: Node;
  variables?: Record<string, unknown>;
  namespaces?: Record<string, string>;
}

/**
 * Parse and evaluate an xpath using the built-in safe variable replacement,
 * then check whether it finds exactly one element
 *
 * @param {string} xpath
 * @param {XPathOptions} options options for XPathEvaluator
 * @see https://github.com/goto100/xpath/blob/master/docs/XPathEvaluator.md
 * @returns {boolean}
 */
function isXpathUnique(
  xpathExpression: string,
  options: XPathOptions,
): boolean {
  return (
    (xpath as unknown as XPathParser).parse(xpathExpression).select(options)
      .length === 1
  );
}

/**
 * Escapes a string for use in a CSS selector.
 *
 * @param {string} value
 * @returns {string} escaped string
 */
function cssEscape(value: string): string {
  if (arguments.length === 0) {
    throw new TypeError("`CSS.escape` requires an argument.");
  }
  const string = String(value);

  // Basic implementation of CSS.escape
  const length = string.length;
  let index = -1;
  let codeUnit;
  let result = "";
  const firstCodeUnit = string.charCodeAt(0);

  while (++index < length) {
    codeUnit = string.charCodeAt(index);
    // Note: there's plenty of strict rules for CSS escaping,
    // but for basic IDs this should cover most cases (spaces, quotes, etc)
    // For now, simpler:
    if (codeUnit === 0x0000) {
      result += "\uFFFD";
      continue;
    }

    if (
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit === 0x007f ||
      (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (index === 1 &&
        codeUnit >= 0x0030 &&
        codeUnit <= 0x0039 &&
        firstCodeUnit === 0x002d)
    ) {
      result += "\\" + codeUnit.toString(16) + " ";
      continue;
    }

    if (index === 0 && length === 1 && codeUnit === 0x002d) {
      result += "\\" + string.charAt(index);
      continue;
    }

    if (
      codeUnit >= 0x0080 ||
      codeUnit === 0x002d ||
      codeUnit === 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      result += string.charAt(index);
      continue;
    }

    result += "\\" + string.charAt(index);
  }
  return result;
}

/**
 * Base class for locator generators providing shared utilities for uniqueness checking and error logging
 * @private
 */
class LocatorGeneratorBase {
  protected _doc: Document;
  protected _domNode: Element;

  /**
   * @param {Document} doc - the document containing the DOM
   * @param {Node} domNode - the DOM node to generate locators for
   */
  constructor(doc: Document, domNode: Node) {
    this._doc = doc;
    this._domNode = domNode as Element;
  }

  /**
   * Get sibling nodes with the same tag name
   *
   * @returns {Node[]} array of sibling nodes with the same tag name
   */
  _getSiblingsWithSameTag(): Node[] {
    if (!this._domNode.parentNode) {
      return [];
    }
    return Array.from(this._domNode.parentNode.childNodes).filter(
      (childNode) =>
        childNode.nodeType === 1 &&
        (childNode as Element).tagName === this._domNode.tagName,
    );
  }

  /**
   * Check if a node is a valid element node
   *
   * @returns {boolean} true if the node is a valid element
   */
  _isValidElementNode(): boolean {
    return !!(this._domNode.tagName && this._domNode.nodeType === 1);
  }
}

/**
 * Generator for XPath locators
 * @private
 */
class XPathGenerator extends LocatorGeneratorBase {
  // Attributes on nodes that are likely to be unique to the node so we should consider first when
  // suggesting xpath locators. These are considered IN ORDER.
  static UNIQUE_ATTRIBUTES = [
    "name",
    "content-desc",
    "id",
    "resource-id",
    "accessibility-id",
  ];

  // Attributes that we should recommend as a fallback but ideally only in conjunction with other
  // attributes
  static MAYBE_UNIQUE_ATTRIBUTES = ["label", "text", "value"];

  /**
   * Get an optimal XPath for a Node
   *
   * @returns {string|null}
   */
  generate(): string | null {
    try {
      // If this isn't an element, we're above the root, return empty string
      if (!this._isValidElementNode()) {
        return "";
      }

      // Try to find a unique XPath based on attributes or node name
      const uniqueXpath = this._tryCasesForUniqueXPath();
      if (uniqueXpath) {
        return uniqueXpath;
      }

      // Fall back to hierarchical XPath based on DOM position
      return this._buildHierarchicalXPath();
    } catch (error) {
      logLocatorError("XPath", error as Error);
      return null;
    }
  }

  /**
   * Return information about whether an xpath query results in a unique element, and the non-unique
   * index of the element in the document if not unique
   *
   * @param {string} xpath
   * @returns {[boolean]|[boolean, number]} tuple consisting of (1) whether the xpath is unique and (2) its index in
   * the set of other similar nodes if not unique
   */
  _determineXpathUniqueness(xpath: string): [boolean] | [boolean, number] {
    let othersWithAttr: Node[] = [];

    // If the XPath does not parse, move to the next unique attribute
    try {
      othersWithAttr = xpathSelect(xpath, this._doc as Node) as Node[];
    } catch {
      return [false];
    }

    if (othersWithAttr.length > 1) {
      return [false, othersWithAttr.indexOf(this._domNode)];
    }

    return [true];
  }

  /**
   * Try to find a unique XPath based on the node's tag name alone
   *
   * @returns {[string, boolean]|[]} tuple of [xpath, isUnique] or empty array if not unique
   */
  _tryNodeNameXPath(): [string, boolean] | [] {
    let xpath = `//${this._domNode.tagName}`;
    const [isUnique] = this._determineXpathUniqueness(xpath);
    if (!isUnique) {
      return [];
    }

    // Even if this node name is unique, if it's the root node, use '/' instead of '//'
    const parent = this._domNode.parentNode as Element | null;
    if (!parent?.tagName) {
      xpath = `/${this._domNode.tagName}`;
    }
    return [xpath, true];
  }

  /**
   * Build an XPath expression from a single attribute
   *
   * @param {string} attrName - the attribute name
   * @param {string} tagForXpath - the tag name to use in the XPath
   * @returns {string|undefined} the XPath expression or undefined if attribute is missing
   */
  _buildXPathFromSingleAttribute(
    attrName: string,
    tagForXpath: string,
  ): string | undefined {
    const attrValue = this._domNode.getAttribute(attrName);
    if (!attrValue) {
      return undefined;
    }
    return `//${tagForXpath}[@${attrName}="${attrValue}"]`;
  }

  /**
   * Build an XPath expression from a pair of attributes
   *
   * @param {[string, string]} attrPair - pair of attribute names
   * @param {string} tagForXpath - the tag name to use in the XPath
   * @returns {string|undefined} the XPath expression or undefined if any attribute is missing
   */
  _buildXPathFromAttributePair(
    attrPair: [string, string],
    tagForXpath: string,
  ): string | undefined {
    const [attr1Name, attr2Name] = attrPair;
    const attr1Value = this._domNode.getAttribute(attr1Name);
    const attr2Value = this._domNode.getAttribute(attr2Name);
    if (!attr1Value || !attr2Value) {
      return undefined;
    }
    return `//${tagForXpath}[@${attr1Name}="${attr1Value}" and @${attr2Name}="${attr2Value}"]`;
  }

  /**
   * Build a semi-unique XPath with an index qualifier
   *
   * @param {string} xpath - the base XPath expression
   * @param {number} index - the index of the node in the matching set
   * @returns {string} the XPath with index qualifier
   */
  _buildSemiUniqueXPath(xpath: string, index: number): string {
    return `(${xpath})[${index + 1}]`;
  }

  /**
   * Try to find a unique XPath by testing attributes
   *
   * @param {string[]|[string, string][]} attrs - attributes to test (single attributes or pairs)
   * @returns {[string|undefined, boolean|undefined]} tuple of [xpath, isUnique] or empty values
   */
  _tryAttributesForUniqueXPath(
    attrs: string[] | [string, string][],
  ): [string | undefined, boolean | undefined] {
    const tagForXpath = this._domNode.tagName || "*";
    const isPairs = attrs.length > 0 && Array.isArray(attrs[0]);
    let uniqueXpath: string | undefined;
    let semiUniqueXpath: string | undefined;

    for (const attrName of attrs) {
      const xpath = isPairs
        ? this._buildXPathFromAttributePair(
            attrName as [string, string],
            tagForXpath,
          )
        : this._buildXPathFromSingleAttribute(attrName as string, tagForXpath);

      if (!xpath) {
        continue;
      }

      const [isUnique, indexIfNotUnique] =
        this._determineXpathUniqueness(xpath);
      if (isUnique) {
        uniqueXpath = xpath;
        break;
      }

      // Store the first semi-unique XPath we find for fallback
      if (!semiUniqueXpath && typeof indexIfNotUnique === "number") {
        semiUniqueXpath = this._buildSemiUniqueXPath(xpath, indexIfNotUnique);
      }
    }

    if (uniqueXpath) {
      return [uniqueXpath, true];
    }
    if (semiUniqueXpath) {
      return [semiUniqueXpath, false];
    }
    return [undefined, undefined];
  }

  /**
   * Given an xml doc and a current dom node, try to find a robust xpath selector qualified by
   * key attributes, which is unique in the document (or unique plus index).
   *
   * @param {string[]|[string, string][]} attrs - a list of attributes to consider, or
   * a list of pairs of attributes to consider in conjunction
   *
   * @returns {[string|undefined, boolean|undefined]} tuple consisting of (1) the xpath selector discovered, and (2)
   * whether this selector is absolutely unique in the document (true) or qualified by index (false)
   */
  _getUniqueXPath(
    attrs: string[] | [string, string][],
  ): [string | undefined, boolean | undefined] {
    // If we're looking for a unique //<nodetype>, return it only if it's actually unique
    if (attrs.length === 0) {
      const result = this._tryNodeNameXPath();
      if (result.length === 0) {
        return [undefined, undefined];
      }
      return result as [string, boolean];
    }

    return this._tryAttributesForUniqueXPath(attrs);
  }

  /**
   * Build all permutations of attribute pairs from the given attributes
   *
   * @param {string[]} attributes - list of attributes to permute
   * @returns {[string, string][]} array of attribute pairs
   */
  _buildAttributePairsPermutations(attributes: string[]): [string, string][] {
    return attributes.flatMap((v1, i) =>
      attributes.slice(i + 1).map((v2) => [v1, v2] as [string, string]),
    );
  }

  /**
   * Build the list of cases to try when generating an XPath
   *
   * @returns {Array<string[]|[string, string][]>} array of attribute configurations to test
   */
  _buildXPathCases(): Array<string[] | [string, string][]> {
    const allAttributes = [
      ...XPathGenerator.UNIQUE_ATTRIBUTES,
      ...XPathGenerator.MAYBE_UNIQUE_ATTRIBUTES,
    ];
    const attrPairsPermutations =
      this._buildAttributePairsPermutations(allAttributes);

    return [
      // Try unique attributes first
      XPathGenerator.UNIQUE_ATTRIBUTES,
      // Try pairs of attributes (unique + maybe)
      attrPairsPermutations,
      // Try maybe-unique attributes alone
      XPathGenerator.MAYBE_UNIQUE_ATTRIBUTES,
      // Try node name alone as last resort
      [],
    ];
  }

  /**
   * Try all XPath cases and return the first unique or best semi-unique result
   *
   * @returns {string|undefined} the best XPath found, or undefined if none found
   */
  _tryCasesForUniqueXPath(): string | undefined {
    const cases = this._buildXPathCases();
    let semiUniqueXpath: string | undefined;

    for (const attrs of cases) {
      const [xpath, isFullyUnique] = this._getUniqueXPath(attrs);
      if (isFullyUnique) {
        return xpath;
      }
      // Keep the first semi-unique XPath we find
      if (!semiUniqueXpath && xpath) {
        semiUniqueXpath = xpath;
      }
    }

    return semiUniqueXpath;
  }

  /**
   * Build a hierarchical XPath based on the node's position in the DOM tree
   *
   * @returns {string} hierarchical XPath for this node
   */
  _buildHierarchicalXPath() {
    let xpath = `/${this._domNode.tagName}`;
    const siblings = this._getSiblingsWithSameTag();

    // Add index if there are multiple siblings with the same tag
    if (siblings.length > 1) {
      const index = siblings.indexOf(this._domNode);
      xpath += `[${index + 1}]`;
    }

    // Recursively build parent path and prepend it
    const parentNode = this._domNode.parentNode;
    if (parentNode && parentNode.nodeType === 1) {
      const parentGenerator = new XPathGenerator(this._doc, parentNode as Node);
      return parentGenerator.generate() + xpath;
    }
    return xpath;
  }
}

/**
 * Generator for iOS Class Chain locators
 * @private
 */
class ClassChainGenerator extends LocatorGeneratorBase {
  // Attributes to check when generating class chain locators
  static CHECKED_ATTRIBUTES = ["name", "label", "value"];

  /**
   * Get an optimal class chain for a Node
   *
   * @returns {string|null}
   */
  generate(): string | null {
    try {
      // If this isn't an element or is XCUIElementTypeApplication, return empty string
      if (this._cannotProcessNode()) {
        return "";
      }

      // Try to find a class chain based on attributes
      const attributeBasedChain = this._tryAttributeBasedClassChain();
      if (attributeBasedChain) {
        return attributeBasedChain;
      }

      // Fall back to hierarchical class chain based on DOM position
      return this._buildHierarchicalClassChain();
    } catch (error) {
      logLocatorError("class chain", error as Error);
      return null;
    }
  }

  /**
   * Check if the node can be processed for class chain generation
   *
   * @returns {boolean} true if the node cannot be processed
   */
  _cannotProcessNode() {
    return (
      !this._isValidElementNode() ||
      this._domNode.tagName === "XCUIElementTypeApplication"
    );
  }

  /**
   * Build a class chain expression from a single attribute
   *
   * @param {string} attrName - the attribute name
   * @param {string} attrValue - the attribute value
   * @returns {string} the class chain expression
   */
  _buildClassChainFromAttribute(attrName: string, attrValue: string): string {
    const tagName = this._domNode.tagName || "*";
    return `/${tagName}[\`${attrName} == "${attrValue}"\`]`;
  }

  /**
   * Build an XPath expression to check uniqueness of an attribute
   *
   * @param {string} attrName - the attribute name
   * @param {string} attrValue - the attribute value
   * @returns {string} the XPath expression
   */
  _buildUniquenessXPath(attrName: string, attrValue: string): string {
    const tagName = this._domNode.tagName || "*";
    return `//${tagName}[@${attrName}="${attrValue}"]`;
  }

  /**
   * Build a class chain with index qualifier for non-unique matches
   *
   * @param {string} classChain - the base class chain
   * @param {number} index - the index of the node in the matching set
   * @returns {string} the class chain with index qualifier
   */
  _buildClassChainWithIndex(classChain: string, index: number): string {
    return `${classChain}[${index + 1}]`;
  }

  /**
   * Try to find a unique class chain based on attributes
   *
   * @returns {string|undefined} the class chain if found, undefined otherwise
   */
  _tryAttributeBasedClassChain() {
    for (const attrName of ClassChainGenerator.CHECKED_ATTRIBUTES) {
      const attrValue = this._domNode.getAttribute(attrName);
      if (!attrValue) {
        continue;
      }

      const xpath = this._buildUniquenessXPath(attrName, attrValue);
      let othersWithAttr;

      // If the XPath does not parse, move to the next attribute
      try {
        othersWithAttr = xpathSelect(xpath, this._doc as Node) as Node[];
      } catch {
        continue;
      }

      // Build the class chain from this attribute
      let classChain = this._buildClassChainFromAttribute(attrName, attrValue);

      // If the attribute isn't unique, add index qualifier
      if (othersWithAttr.length > 1) {
        const index = othersWithAttr.indexOf(this._domNode);
        classChain = this._buildClassChainWithIndex(classChain, index);
      }

      return classChain;
    }

    return undefined;
  }

  /**
   * Build a hierarchical class chain based on the node's position in the DOM tree
   *
   * @returns {string} hierarchical class chain for this node
   */
  _buildHierarchicalClassChain(): string {
    let classChain = `/${this._domNode.tagName}`;
    const siblings = this._getSiblingsWithSameTag();

    // Add index if there are multiple siblings with the same tag
    if (siblings.length > 1) {
      const index = siblings.indexOf(this._domNode);
      classChain += `[${index + 1}]`;
    }

    // Recursively build parent path and prepend it
    const parentNode = this._domNode.parentNode;
    if (parentNode && parentNode.nodeType === 1) {
      const parentGenerator = new ClassChainGenerator(this._doc, parentNode);
      return parentGenerator.generate() + classChain;
    }
    return classChain;
  }
}

/**
 * Generator for iOS Predicate String locators
 * @private
 */
class PredicateStringGenerator extends LocatorGeneratorBase {
  // Attributes to check when generating predicate string locators
  static CHECKED_ATTRIBUTES = ["name", "label", "value", "type"];

  /**
   * Get an optimal predicate string for a Node
   * Only works for a single element - no parent/child scope
   *
   * @returns {string|null}
   */
  generate(): string | null {
    try {
      // BASE CASE #1: If this isn't an element, or we're above the root, return empty string
      if (!this._isValidElementNode()) {
        return "";
      }

      // BASE CASE #2: Check all attributes and try to find the best way
      const xpathAttributes: string[] = [];
      const predicateString: string[] = [];
      let othersWithAttr: Node[];

      for (const attrName of PredicateStringGenerator.CHECKED_ATTRIBUTES) {
        const attrValue = this._domNode.getAttribute(attrName);
        if (_.isEmpty(attrValue)) {
          continue;
        }

        xpathAttributes.push(`@${attrName}="${attrValue}"`);
        const xpath = `//*[${xpathAttributes.join(" and ")}]`;
        predicateString.push(`${attrName} == "${attrValue}"`);

        // If the XPath does not parse, move to the next attribute
        try {
          othersWithAttr = xpathSelect(xpath, this._doc as Node) as Node[];
        } catch {
          continue;
        }

        // Return as soon as the accumulated attribute combination is unique
        if (othersWithAttr.length === 1) {
          return predicateString.join(" AND ");
        }
      }
      return null;
    } catch (error) {
      // If there's an unexpected exception, abort
      logLocatorError("predicate string", error as Error);
      return null;
    }
  }
}

/**
 * Generator for Android UiAutomator locators
 * @private
 */
class UiAutomatorGenerator extends LocatorGeneratorBase {
  // Map of element attributes to their UiAutomator syntax, ordered by (likely) decreasing uniqueness
  static CHECKED_ATTRIBUTES = [
    ["resource-id", "resourceId"],
    ["text", "text"],
    ["content-desc", "description"],
    ["class", "className"],
  ];

  private _path: string;

  /**
   * @param {Document} doc - the document containing the DOM
   * @param {Node} domNode - the DOM node to generate locators for
   * @param {string} path - a dot-separated string of indices
   */
  constructor(doc: Document, domNode: Node, path: string) {
    super(doc, domNode);
    this._path = path;
  }

  /**
   * Get an optimal UiAutomator selector for a Node
   * Only works for elements inside the last direct child of the hierarchy (xpath: /hierarchy/*[last()] )
   *
   * @returns {string|null}
   */
  generate(): string | null {
    try {
      // If this isn't an element, return empty string
      if (!this._isValidElementNode()) {
        return "";
      }

      // Check if element is in the last hierarchy child
      if (!this._isInLastHierarchyChild()) {
        return null;
      }

      // Create a new document scope with only the last hierarchy child
      const { newDoc, newDomNode } = this._createLastHierarchyChildScope();

      // Try to find a unique UiAutomator selector
      return this._tryFindUniqueSelector(newDoc, newDomNode);
    } catch (error) {
      logLocatorError("uiautomator selector", error as Error);
      return null;
    }
  }

  /**
   * Get the hierarchy children from the document
   *
   * @returns {Node[]} array of hierarchy children
   */
  _getHierarchyChildren(): Node[] {
    const docChildren = childNodesOf(this._doc);
    if (_.isEmpty(docChildren)) {
      return [];
    }
    const hierarchyChildren = childNodesOf(docChildren[0]);
    return hierarchyChildren || [];
  }

  /**
   * Check if the element is in the last hierarchy child
   *
   * @returns {boolean} true if element is in the last hierarchy child
   */
  _isInLastHierarchyChild(): boolean {
    const hierarchyChildren = this._getHierarchyChildren();
    if (_.isEmpty(hierarchyChildren)) {
      return false;
    }

    const lastHierarchyChildIndex = (hierarchyChildren.length - 1).toString();
    const pathArray = this._path.split(".");
    const requestedHierarchyChildIndex = pathArray[0];

    return requestedHierarchyChildIndex === lastHierarchyChildIndex;
  }

  /**
   * Create a new document scope containing only the last hierarchy child
   *
   * @returns {{newDoc: Document, newDomNode: Node}} new document and node in the new scope
   */
  _createLastHierarchyChildScope(): { newDoc: Document; newDomNode: Element } {
    const hierarchyChildren = this._getHierarchyChildren();
    const lastHierarchyChildIndex = (hierarchyChildren.length - 1).toString();
    const lastHierarchyChild =
      hierarchyChildren[parseInt(lastHierarchyChildIndex, 10)];

    // Convert the last hierarchy child to XML and wrap it in a dummy tag to create a Document
    const newXml = domToXML(lastHierarchyChild);
    const newDoc = xmlToDOM(`<dummy>${newXml}</dummy>`);

    // Modify the path to start from index 0 in the new scope
    const pathArray = this._path.split(".");
    pathArray[0] = "0";
    const newPath = pathArray.join(".");

    // Find the node in the new document scope
    const newDomNode = findDOMNodeByPath(newPath, newDoc) as Element;

    return { newDoc, newDomNode };
  }

  /**
   * Build a UiAutomator selector from an attribute
   *
   * @param {string} attrTranslation - the UiAutomator method name
   * @param {string} attrValue - the attribute value
   * @returns {string} the UiAutomator selector
   */
  _buildUiSelector(attrTranslation: string, attrValue: string): string {
    return `new UiSelector().${attrTranslation}("${attrValue}")`;
  }

  /**
   * Build a UiAutomator selector with instance index
   *
   * @param {string} uiSelector - the base UiAutomator selector
   * @param {number} index - the instance index
   * @returns {string} the UiAutomator selector with instance
   */
  _buildUiSelectorWithInstance(uiSelector: string, index: number): string {
    return `${uiSelector}.instance(${index})`;
  }

  /**
   * Build an XPath to check uniqueness of an attribute in the new document scope
   *
   * @param {Node} domNode - the DOM node in the new scope
   * @param {string} attrName - the attribute name
   * @param {string} attrValue - the attribute value
   * @returns {string} the XPath expression
   */
  _buildUniquenessXPath(
    domNode: Element,
    attrName: string,
    attrValue: string,
  ): string {
    return `//${domNode.tagName}[@${attrName}="${attrValue}"]`;
  }

  /**
   * Try to find a unique UiAutomator selector based on attributes
   *
   * @param {Document} doc - the document scope to search in
   * @param {Node} domNode - the DOM node in the new scope
   * @returns {string|null} the most unique selector found, or null
   */
  _tryFindUniqueSelector(doc: Document, domNode: Node): string | null {
    let mostUniqueSelector: string | undefined;
    let othersWithAttrMinCount: number | undefined;

    for (const [
      attrName,
      attrTranslation,
    ] of UiAutomatorGenerator.CHECKED_ATTRIBUTES) {
      const attrValue = (domNode as Element).getAttribute(attrName);
      if (_.isEmpty(attrValue) || !attrValue) {
        continue;
      }

      const xpath = this._buildUniquenessXPath(
        domNode as Element,
        attrName,
        attrValue,
      );
      const uiSelector = this._buildUiSelector(attrTranslation, attrValue);

      // If the XPath does not parse, move to the next attribute
      let othersWithAttr: Node[];
      try {
        othersWithAttr = xpathSelect(xpath, doc as Node) as Node[];
      } catch {
        continue;
      }

      // If the attribute is unique, return it immediately
      if (othersWithAttr.length === 1) {
        return uiSelector;
      }

      // Keep track of the selector with the least matches
      if (
        !othersWithAttrMinCount ||
        othersWithAttr.length < othersWithAttrMinCount
      ) {
        othersWithAttrMinCount = othersWithAttr.length;
        const index = othersWithAttr.indexOf(domNode);
        mostUniqueSelector = this._buildUiSelectorWithInstance(
          uiSelector,
          index,
        );
      }
    }

    return mostUniqueSelector || null;
  }
}

/**
 * Generator for JSONPath expressions
 * @private
 */
class JSONPathGenerator {
  private _rootJSON: SourceJSON;
  private _targetNode: SourceJSON;

  /**
   * @param {SourceJSON} rootJSON - the root JSON object
   * @param {SourceJSON} targetNode - the target node to find
   */
  constructor(rootJSON: SourceJSON, targetNode: SourceJSON) {
    this._rootJSON = rootJSON;
    this._targetNode = targetNode;
  }

  /**
   * Generate an optimal JSONPath for the target node
   *
   * @returns {string|null} the JSONPath expression or null if not found
   */
  generate(): string | null {
    try {
      // Try to find the path by traversing the JSON tree
      const path = this._findNodePath(this._rootJSON, this._targetNode, "$");
      return path;
    } catch (error) {
      logLocatorError("JSONPath", error as Error);
      return null;
    }
  }

  /**
   * Recursively find the path to the target node
   *
   * @param {SourceJSON} currentNode - the current node being traversed
   * @param {SourceJSON} targetNode - the target node to find
   * @param {string} currentPath - the current JSONPath
   * @returns {string|null} the JSONPath to the target node or null if not found
   */
  _findNodePath(
    currentNode: SourceJSON,
    targetNode: SourceJSON,
    currentPath: string,
  ): string | null {
    // Check if current node is the target
    if (this._isSameNode(currentNode, targetNode)) {
      return currentPath;
    }

    // Traverse children
    if (currentNode.children && Array.isArray(currentNode.children)) {
      for (let i = 0; i < currentNode.children.length; i++) {
        const child = currentNode.children[i];
        const childPath = `${currentPath}.children[${i}]`;
        const result = this._findNodePath(child, targetNode, childPath);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Check if two nodes are the same by comparing their properties
   *
   * @param {SourceJSON} node1 - first node
   * @param {SourceJSON} node2 - second node
   * @returns {boolean} true if nodes are the same
   */
  _isSameNode(node1: SourceJSON, node2: SourceJSON): boolean {
    // Compare by reference first
    if (node1 === node2) {
      return true;
    }

    // Compare by key properties
    const props1 = this._getNodeProperties(node1);
    const props2 = this._getNodeProperties(node2);

    return JSON.stringify(props1) === JSON.stringify(props2);
  }

  /**
   * Get the identifying properties of a node
   *
   * @param {SourceJSON} node - the node
   * @returns {Record<string, unknown>} the identifying properties
   */
  _getNodeProperties(node: SourceJSON): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    // Include tagName if available
    if (node.tagName) {
      props.tagName = node.tagName;
    }

    // Include attributes if available
    if (node.attributes) {
      props.attributes = node.attributes;
    }

    // Include bounds if available
    if (node.boundsArray) {
      props.boundsArray = node.boundsArray;
    }

    // Include key if available
    if (node.key) {
      props.key = node.key;
    }

    return props;
  }
}

/**
 * Generator for simple locator strategies in both native and webview contexts
 * @private
 */
class SimpleLocatorGenerator {
  // Map of native element attributes to their matching simple (optimal) locator strategies
  static NATIVE_STRATEGY_MAP = [
    ["name", STRATS.ACCESSIBILITY_ID],
    ["content-desc", STRATS.ACCESSIBILITY_ID],
    ["id", STRATS.ID],
    ["rntestid", STRATS.ID],
    ["resource-id", STRATS.ID],
    ["class", STRATS.CLASS_NAME],
    ["type", STRATS.CLASS_NAME],
  ];

  private _doc: Document;
  private _tag: string;
  private _attributes: Record<string, string>;

  /**
   * @param {Record<string, string|object>} elementProps relevant element properties
   * @param {Document} sourceDoc - the source document
   */
  constructor(
    elementProps: { tag: string; attributes: Record<string, string> },
    sourceDoc: Document,
  ) {
    this._doc = sourceDoc;
    this._tag = elementProps.tag;
    this._attributes = elementProps.attributes;
  }

  /**
   * Get suggested selectors for simple locator strategies in native context:
   * id, class name, and accessibility id
   *
   * @returns {Record<string, string>} mapping of native strategies to selectors
   */
  generateNativeSelectors(): Record<string, string> {
    return SimpleLocatorGenerator.NATIVE_STRATEGY_MAP.reduce(
      (res, [strategyAlias, strategy]) => {
        const value = this._attributes?.[strategyAlias];
        if (value && areAttrAndValueUnique(strategyAlias, value, this._doc)) {
          res[strategy] = value;
        }
        return res;
      },
      {} as Record<string, string>,
    );
  }

  /**
   * Get suggested selectors for simple locator strategies in webview context:
   * id (css) and tag name
   *
   * @returns {Record<string, string>} mapping of web strategies to selectors
   */
  generateWebSelectors(): Record<string, string> {
    const webStrategyMap: Record<string, string> = {};
    // id (css)
    const idValue = this._attributes?.id;
    if (idValue && areAttrAndValueUnique("id", idValue, this._doc)) {
      webStrategyMap[STRATS.CSS] = `#${cssEscape(idValue)}`;
    }
    // tag name
    if (isTagUnique(this._tag, this._doc)) {
      webStrategyMap[STRATS.TAG_NAME] = this._tag;
    }
    return webStrategyMap;
  }
}

/**
 * Log an error when a locator strategy fails
 *
 * @param {string} strategy - the locator strategy name
 * @param {Error} error - the error that occurred
 */
function logLocatorError(strategy: string, error: Error) {
  log.error(
    `The most optimal ${strategy} could not be determined because an error was thrown: '${error}'`,
  );
}
