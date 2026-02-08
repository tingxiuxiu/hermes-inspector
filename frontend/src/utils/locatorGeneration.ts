import XPath, { select as xpathSelect } from "xpath";
import _ from "lodash";

import {
  childNodesOf,
  domToXML,
  findDOMNodeByPath,
  xmlToDOM,
} from "./sourceParsing";

// 定义类型接口
interface SelectedElement {
  attributes: Record<string, string | number>;
  path: string;
}

// Attributes on nodes that are likely to be unique to the node so we should consider first when
// suggesting xpath locators. These are considered IN ORDER.
const UNIQUE_XPATH_ATTRIBUTES: string[] = [
  "name",
  "content-desc",
  "id",
  "resource-id",
  "accessibility-id",
];

// Attributes that we should recommend as a fallback but ideally only in conjunction with other
// attributes
const MAYBE_UNIQUE_XPATH_ATTRIBUTES: string[] = ["label", "text", "value"];

const CHECKED_CLASS_CHAIN_ATTRIBUTES: string[] = ["name", "label", "value"];

const CHECKED_PREDICATE_ATTRIBUTES: string[] = [
  "name",
  "label",
  "value",
  "type",
];

// Map of element attributes to their UiAutomator syntax, ordered by (likely) decreasing uniqueness
const CHECKED_UIAUTOMATOR_ATTRIBUTES: [string, string][] = [
  ["resource-id", "resourceId"],
  ["text", "text"],
  ["content-desc", "description"],
  ["class", "className"],
];

// Map of element attributes to their matching simple (optimal) locator strategies
const SIMPLE_STRATEGY_MAPPINGS: [string, string][] = [
  ["name", "accessibility id"],
  ["content-desc", "accessibility id"],
  ["id", "id"],
  ["rntestid", "id"],
  ["resource-id", "id"],
  ["class", "class name"],
  ["type", "class name"],
];

// 日志工具函数
function logLocatorError(strategy: string, error: Error): void {
  console.error(
    `The most optimal ${strategy} could not be determined because an error was thrown: '${error}'`
  );
}

/**
 * Check whether the provided attribute & value are unique in the source
 *
 * @param {string} attrName
 * @param {string} attrValue
 * @param {Document} sourceDoc
 * @returns {boolean}
 */
export function areAttrAndValueUnique(
  attrName: string,
  attrValue: string,
  sourceDoc: Document
): boolean {
  // If no sourceDoc provided, assume it's unique
  if (!sourceDoc || _.isEmpty(sourceDoc)) {
    return true;
  }
  return (
    (
      xpathSelect(
        `//*[@${attrName}="${attrValue.replace(/"/g, "")}"]`,
        sourceDoc
      ) as Node[]
    ).length < 2
  );
}

/**
 * Get suggested selectors for simple locator strategies (which match a specific attribute)
 *
 * @param {Record<string, string|number>} attributes element attributes
 * @param {Document} sourceDoc
 * @param {boolean} isNative whether native context is active
 * @returns {Record<string, string>} mapping of strategies to selectors
 */
export function getSimpleSuggestedLocators(
  attributes: Record<string, string | number>,
  sourceDoc: Document,
  isNative: boolean = true
): Record<string, string> {
  const res: Record<string, string> = {};
  for (const [strategyAlias, strategy] of SIMPLE_STRATEGY_MAPPINGS) {
    // accessibility id is only supported in native context
    if (!(strategy === "accessibility id" && !isNative)) {
      const value = attributes[strategyAlias];
      if (
        value &&
        areAttrAndValueUnique(strategyAlias, String(value), sourceDoc)
      ) {
        res[strategy] = String(value);
      }
    }
  }
  return res;
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
  automationName: string
): Record<string, string> {
  const complexLocators: Record<string, string | null> = {};
  const domNode = findDOMNodeByPath(path, sourceDoc);
  if (domNode) {
    if (isNative) {
      switch (automationName) {
        case "xcuitest":
        case "mac2": {
          const optimalClassChain = getOptimalClassChain(sourceDoc, domNode);
          complexLocators["-ios class chain"] = optimalClassChain
            ? "**" + optimalClassChain
            : null;
          complexLocators["-ios predicate string"] = getOptimalPredicateString(
            sourceDoc,
            domNode
          );
          break;
        }
        case "uiautomator2": {
          complexLocators["-android uiautomator"] =
            getOptimalUiAutomatorSelector(sourceDoc, domNode, path);
          break;
        }
      }
    }
    complexLocators.xpath = getOptimalXPath(sourceDoc, domNode);
  }

  // Remove entries for locators where the optimal selector could not be found
  return _.omitBy(complexLocators, _.isNil) as Record<string, string>;
}

/**
 * Get suggested selectors for all locator strategies
 *
 * @param {SelectedElement} selectedElement element node in JSON format
 * @param {string} sourceXML
 * @param {boolean} isNative whether native context is active
 * @param {string} automationName
 * @returns {Array<[string, string]>} array of tuples, consisting of the locator strategy and selector
 */
export function getSuggestedLocators(
  selectedElement: SelectedElement,
  sourceXML: string,
  isNative: boolean,
  automationName: string
): Array<[string, string]> {
  const sourceDoc = xmlToDOM(sourceXML);
  const simpleLocators = getSimpleSuggestedLocators(
    selectedElement.attributes,
    sourceDoc,
    isNative
  );
  const complexLocators = getComplexSuggestedLocators(
    selectedElement.path,
    sourceDoc,
    isNative,
    automationName
  );
  return _.toPairs({ ...simpleLocators, ...complexLocators });
}

/**
 * Return information about whether an xpath query results in a unique element, and the non-unique
 * index of the element in the document if not unique
 *
 * @param {string} xpath
 * @param {Document} doc
 * @param {Node} domNode - the current node
 * @returns {[boolean, number?]} tuple consisting of (1) whether the xpath is unique and (2) its index in
 * the set of other similar nodes if not unique
 */
function determineXpathUniqueness(
  xpath: string,
  doc: Document,
  domNode: Node
): [boolean, number?] {
  let othersWithAttr: Node[] = [];

  // If the XPath does not parse, move to the next unique attribute
  try {
    // eslint-disable-next-line import/no-named-as-default-member -- needed for Vitest spy functionality
    othersWithAttr = XPath.select(xpath, doc) as Node[];
  } catch {
    return [false];
  }

  if (othersWithAttr.length > 1) {
    return [false, othersWithAttr.indexOf(domNode)];
  }

  return [true];
}

/**
 * Given an xml doc and a current dom node, try to find a robust xpath selector qualified by
 * key attributes, which is unique in the document (or unique plus index).
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @param {Array<string>|Array<[string, string]>} attrs - a list of attributes to consider, or
 * a list of pairs of attributes to consider in conjunction
 *
 * @returns {[string|undefined, boolean|undefined]} tuple consisting of (1) the xpath selector discovered, and (2)
 * whether this selector is absolutely unique in the document (true) or qualified by index (false)
 */
export function getUniqueXPath(
  doc: Document,
  domNode: Node,
  attrs: (string | [string, string])[]
): [string | undefined, boolean | undefined] {
  try {
    const elementNode = domNode as Element;
    const isNodeName = _.isEmpty(attrs);
    const isPairs = _.every(attrs, _.isArray);
    const tagForXpath = elementNode.tagName || "*";

    // If we're looking for a unique //<nodetype>, return it only if it's actually unique. No
    // semi-uniqueness here!
    if (isNodeName && elementNode.tagName) {
      let xpath = `//${elementNode.tagName}`;
      const [isUnique] = determineXpathUniqueness(xpath, doc, domNode);
      if (isUnique) {
        // even if this node name is unique, if it's the root node, we don't want to refer to it using
        // '//' but rather '/'
        if (
          !elementNode.parentNode ||
          !(elementNode.parentNode as Node).nodeType
        ) {
          xpath = `/${elementNode.tagName}`;
        }
        return [xpath, true];
      }
      return [undefined, undefined];
    }

    // Otherwise go through our various attributes to look for uniqueness
    for (const attrName of attrs) {
      let xpath: string;
      if (isPairs) {
        const [attr1Name, attr2Name] = attrName as [string, string];
        const [attr1Value, attr2Value] = [
          elementNode.getAttribute(attr1Name),
          elementNode.getAttribute(attr2Name),
        ];
        if (!attr1Value || !attr2Value) {
          continue;
        }
        xpath = `//${tagForXpath}[@${attr1Name}="${attr1Value}" and @${attr2Name}="${attr2Value}"]`;
      } else {
        const attrValue = elementNode.getAttribute(attrName as string);
        if (!attrValue) {
          continue;
        }
        xpath = `//${tagForXpath}[@${attrName as string}="${attrValue}"]`;
      }
      const [isUnique] = determineXpathUniqueness(xpath, doc, domNode);
      if (isUnique) {
        const uniqueXpath = xpath;
        return [uniqueXpath, true];
      }

      // if the xpath wasn't totally unique it might still be our best bet. Store a less unique
      // version qualified by an index for later in semiUniqueXpath. If we can't find a better
      // unique option down the road, we'll fall back to this
      // We don't store this here since it's handled in getOptimalXPath
    }
    return [undefined, undefined];
  } catch (error) {
    logLocatorError("getUniqueXPath", error as Error);
    return [undefined, undefined];
  }
}

/**
 * Get an optimal XPath for a Node
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalXPath(doc: Document, domNode: Node): string | null {
  try {
    // BASE CASE #1: If this isn't an element, we're above the root, return empty string
    const elementNode = domNode as Element;
    if (!elementNode.tagName || domNode.nodeType !== 1) {
      return "";
    }

    const attrsForPairs = [
      ...UNIQUE_XPATH_ATTRIBUTES,
      ...MAYBE_UNIQUE_XPATH_ATTRIBUTES,
    ];
    const attrPairsPermutations = attrsForPairs.flatMap((v1, i) =>
      attrsForPairs.slice(i + 1).map((v2) => [v1, v2])
    );

    const cases = [
      // BASE CASE #2: If this node has a unique attribute or content attribute, return an absolute
      // XPath with that attribute
      UNIQUE_XPATH_ATTRIBUTES,

      // BASE CASE #3: If this node has a unique pair of attributes including 'maybe' attributes,
      // return an xpath based on that pair
      attrPairsPermutations as [string, string][],

      // BASE CASE #4: Look for a 'maybe' unique attribute on its own. It's better if we find one
      // of these that's unique in conjunction with another attribute, but if not, that's OK.
      // Better than a hierarchical query.
      MAYBE_UNIQUE_XPATH_ATTRIBUTES,

      // BASE CASE #5: Look to see if the node type is unique in the document
      [],
    ];

    // It's possible that in all of these cases we don't find a truly unique selector. But
    // a selector qualified by attribute with an index attached like //*[@id="foo"][1] is still
    // better than a fully path-based selector. We call this a 'semi unique xpath'
    let semiUniqueXpath: string | undefined;

    // Go through each of our cases and look for selectors for each case in order
    for (const attrs of cases) {
      const [xpath, isFullyUnique] = getUniqueXPath(doc, domNode, attrs);
      if (isFullyUnique && xpath) {
        // if we ever encounter an actually unique selector, return it straightaway
        return xpath;
      } else if (!semiUniqueXpath && xpath) {
        // if we have a semin unique selector, and haven't already captured a semi unique selector,
        // hold onto it for later. If we end up without any unique selectors from any of the cases,
        // then we'll return this. But we want to make sure to return our FIRST instance of a semi
        // unique selector, since it might theoretically be the best.
        semiUniqueXpath = xpath;
      }
    }

    // Once we've gone through all our cases, if we do have a semi unique xpath, send that back
    if (semiUniqueXpath) {
      return semiUniqueXpath;
    }

    // Otherwise fall back to a purely hierarchical expression of this dom node's position in the
    // document as a last resort.
    // First get the relative xpath of this node using tagName
    let xpath = `/${elementNode.tagName}`;

    // If this node has siblings of the same tagName, get the index of this node
    if (domNode.parentNode) {
      // Get the siblings
      const childNodes = Array.prototype.slice
        .call(domNode.parentNode.childNodes, 0)
        .filter(
          (childNode) =>
            childNode.nodeType === 1 &&
            (childNode as Element).tagName === elementNode.tagName
        );

      // If there's more than one sibling, append the index
      if (childNodes.length > 1) {
        const index = childNodes.indexOf(domNode);
        xpath += `[${index + 1}]`;
      }
    }

    // Make a recursive call to this nodes parents and prepend it to this xpath
    const parentXPath = getOptimalXPath(doc, domNode.parentNode || domNode);
    return parentXPath + xpath;
  } catch (error) {
    // If there's an unexpected exception, abort
    logLocatorError("XPath", error as Error);
    return null;
  }
}

/**
 * Get an optimal class chain for a Node based on the getOptimalXPath method
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalClassChain(
  doc: Document,
  domNode: Node
): string | null {
  try {
    // BASE CASE #1: If this isn't an element, or we're above the root, return empty string
    const elementNode = domNode as Element;
    if (!elementNode.tagName || domNode.nodeType !== 1) {
      return "";
    }

    // BASE CASE #2: If this node has a unique class chain based on attributes, return it
    let classChain, othersWithAttr;

    for (const attrName of CHECKED_CLASS_CHAIN_ATTRIBUTES) {
      const attrValue = elementNode.getAttribute(attrName);
      if (_.isEmpty(attrValue)) {
        continue;
      }
      const xpath = `//${
        elementNode.tagName || "*"
      }[@${attrName}="${attrValue}"]`;
      classChain = `/${
        elementNode.tagName || "*"
      }[\`${attrName} == "${attrValue}"\`]`;

      // If the XPath does not parse, move to the next unique attribute
      try {
        othersWithAttr = xpathSelect(xpath, doc) as Node[];
      } catch {
        continue;
      }

      // If the attribute isn't actually unique, get its index too
      if (othersWithAttr.length > 1) {
        const index = othersWithAttr.indexOf(domNode);
        classChain = `${classChain}[${index + 1}]`;
      }
      return classChain;
    }

    // BASE CASE #3: If this node has no unique attributes, repeat checks for its parent
    // Get the relative xpath of this node using tagName
    classChain = `/${elementNode.tagName}`;

    // If this node has siblings of the same tagName, get the index of this node
    if (domNode.parentNode) {
      // Get the siblings
      const childNodes = Array.prototype.slice
        .call(domNode.parentNode.childNodes, 0)
        .filter(
          (childNode) =>
            childNode.nodeType === 1 &&
            (childNode as Element).tagName === elementNode.tagName
        );

      // If there's more than one sibling, append the index
      if (childNodes.length > 1) {
        const index = childNodes.indexOf(domNode);
        classChain += `[${index + 1}]`;
      }
    }

    // Make a recursive call to this nodes parents and prepend it to this xpath
    return (
      getOptimalClassChain(doc, domNode.parentNode || domNode) + classChain
    );
  } catch (error) {
    // If there's an unexpected exception, abort
    logLocatorError("class chain", error as Error);
    return null;
  }
}

/**
 * Get an optimal predicate string for a Node based on the getOptimalXPath method
 * Only works for a single element - no parent/child scope
 *
 * @param {Document} doc
 * @param {Node} domNode
 * @returns {string|null}
 */
export function getOptimalPredicateString(
  doc: Document,
  domNode: Node
): string | null {
  try {
    // BASE CASE #1: If this isn't an element, or we're above the root, return empty string
    const elementNode = domNode as Element;
    if (!elementNode.tagName || domNode.nodeType !== 1) {
      return "";
    }

    // BASE CASE #2: Check all attributes and try to find the best way
    const xpathAttributes = [];
    const predicateString = [];
    let othersWithAttr;

    for (const attrName of CHECKED_PREDICATE_ATTRIBUTES) {
      const attrValue = elementNode.getAttribute(attrName);
      if (_.isEmpty(attrValue)) {
        continue;
      }

      xpathAttributes.push(`@${attrName}="${attrValue}"`);
      predicateString.push(`${attrName} == "${attrValue}"`);

      // If the XPath does not parse, move to the next attribute
      try {
        othersWithAttr = xpathSelect(
          `//*[${xpathAttributes.join(" and ")}]`,
          doc
        ) as Node[];
      } catch {
        continue;
      }

      // Return as soon as the accumulated attribute combination is unique
      if (othersWithAttr.length === 1) {
        return predicateString.join(" AND ");
      }
    }
    return null; // 添加默认返回值
  } catch (error) {
    // If there's an unexpected exception, abort
    logLocatorError("predicate string", error as Error);
    return null;
  }
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
  path: string
): string | null {
  try {
    // BASE CASE #1: If this isn't an element, or we're above the root, return empty string
    const elementNode = domNode as Element;
    if (!elementNode.tagName || domNode.nodeType !== 1) {
      return "";
    }

    // UiAutomator can only find elements inside the last direct child of the hierarchy.
    // hierarchy is the child of doc (which is <xml/>), so need to get the children of its child
    // BASE CASE #2: If there is no hierarchy or its children, return null
    const docChildren = childNodesOf(doc);
    const hierarchyChildren = _.isEmpty(docChildren)
      ? []
      : childNodesOf(docChildren[0]);
    if (_.isEmpty(hierarchyChildren)) {
      return null;
    }

    // BASE CASE #3: If looking for an element that is not inside
    // the last direct child of the hierarchy, return null
    const lastHierarchyChildIndex = parseInt(
      (hierarchyChildren.length - 1).toString(),
      10
    );
    const pathArray = path.split(".");
    const requestedHierarchyChildIndex = pathArray[0];
    if (requestedHierarchyChildIndex !== lastHierarchyChildIndex.toString()) {
      return null;
    }

    // In order to use only the last direct child of the hierarchy as the new scope,
    // need to recreate it as a Document (Node -> XML -> Document),
    // then modify the path by changing the first index,
    // and finally recreate the domNode, since it still references the original parent
    const lastHierarchyChild = hierarchyChildren[lastHierarchyChildIndex];
    const newXml = domToXML(lastHierarchyChild);
    // wrap the new XML in a dummy tag which will have the node type Document
    const newDoc = xmlToDOM(`<dummy>${newXml}</dummy>`);
    pathArray[0] = "0";
    const newPath = pathArray.join(".");
    const newDomNode = findDOMNodeByPath(newPath, newDoc) as Element | null; // 将 Node 类型转换为 Element 类型

    // BASE CASE #4: Check all attributes and try to find unique ones
    let uiSelector, othersWithAttr, othersWithAttrMinCount, mostUniqueSelector;

    for (const [attrName, attrTranslation] of CHECKED_UIAUTOMATOR_ATTRIBUTES) {
      if (!newDomNode) continue; // 安全检查
      const attrValue = newDomNode.getAttribute(attrName);
      if (_.isEmpty(attrValue)) {
        continue;
      }

      const xpath = `//${newDomNode.tagName}[@${attrName}="${attrValue}"]`;
      uiSelector = `new UiSelector().${attrTranslation}("${attrValue}")`;

      // If the XPath does not parse, move to the next unique attribute
      try {
        othersWithAttr = xpathSelect(xpath, newDoc) as Node[];
      } catch {
        continue;
      }

      // If the attribute is unique, return it, otherwise save it and add an index,
      // but only if it returns the least number of elements
      if (othersWithAttr.length === 1) {
        return uiSelector;
      } else if (
        !othersWithAttrMinCount ||
        othersWithAttr.length < othersWithAttrMinCount
      ) {
        othersWithAttrMinCount = othersWithAttr.length;
        mostUniqueSelector = `${uiSelector}.instance(${othersWithAttr.indexOf(
          newDomNode
        )})`;
      }
    }

    // BASE CASE #5: Did not find any unique attributes - use the 'most unique' selector
    if (mostUniqueSelector) {
      return mostUniqueSelector;
    }
    return null; // 添加默认返回值
  } catch (error) {
    // If there's an unexpected exception, abort
    logLocatorError("uiautomator selector", error as Error);
    return null;
  }
}
