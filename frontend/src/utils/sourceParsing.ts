import { default as _ } from "lodash";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

// Helper function to select only Node elements (ignores document types, text nodes, etc.)
// 添加 export 关键字导出 childNodesOf 函数
export function childNodesOf(parentNode: Node): Node[] {
  return Array.from(parentNode.childNodes).filter((n) => n.nodeType === 1);
}

export function xmlToDOM(xmlString: string): Document {
  const domParser = new DOMParser();
  return domParser.parseFromString(xmlString, "application/xml");
}

export function domToXML(domNode: Node): string {
  const xmlSerializer = new XMLSerializer();
  return xmlSerializer.serializeToString(domNode);
}

export interface JSONElement {
  type: string;
  children?: JSONElement[];
  attributes?: Record<string, any>;
}

export function xmlToJSON(xmlString: string): [any, any, any, Document] {
  const dom = xmlToDOM(xmlString);
  const treeMap: any = {};
  const xmlPathMap: any = {};

  // Helper function to convert bounds string to boundsArray
  const parseBounds = (boundsString: string | null): number[] => {
    if (!boundsString) return [0, 0, 0, 0];
    const boundValues = boundsString
      .replace(/\]\[/g, ",")
      .replace(/\[|\]/g, "");
    return boundValues.split(",").map((num) => parseInt(num, 10));
  };

  const xmlToJSONHelper = (domNode: Node, path: string = "0"): any => {
    const element = domNode as Element;
    const attributes: Record<string, string> = {};

    // Collect all attributes
    const attrList = element.attributes || [];
    for (let i = 0; i < attrList.length; i++) {
      const attr = attrList[i];
      attributes[attr.name] = attr.value;
    }

    // Parse bounds
    const boundsString = element.getAttribute("bounds");
    const boundsArray = parseBounds(boundsString);
    const center =
      boundsArray.length === 4
        ? [
            (boundsArray[0] + boundsArray[2]) / 2,
            (boundsArray[1] + boundsArray[3]) / 2,
          ]
        : [0, 0];

    // Process children
    const childElements = childNodesOf(domNode);
    const children = childElements.map((child, index) =>
      xmlToJSONHelper(child, `${path}.${index}`)
    );

    // Create TreeObject
    const treeObject: any = {
      attributes,
      boundsArray,
      center,
      children,
      path,
      tagName: domNode.nodeName,
      domNode: domNode as Element,
    };

    // Store in maps
    treeMap[path] = treeObject;
    xmlPathMap[path] = domNode as Element;

    return treeObject;
  };

  // 从根元素开始处理
  const childElements = childNodesOf(dom);
  const rootElement = childElements[0] || dom.documentElement;
  const rootTreeObject = xmlToJSONHelper(rootElement);

  // 返回数组格式，符合所有调用处的期望
  return [rootTreeObject, treeMap, xmlPathMap, dom];
}

export function xmlToBounds(xmlString: string): any[] {
  const dom = xmlToDOM(xmlString);

  // 使用reduce+concat代替flatMap和concat.apply，避免ConcatArray类型错误
  const boundsArray = childNodesOf(dom).reduce((acc, current) => {
    return acc.concat(
      childNodesOf(current).reduce((acc2, current2) => {
        const currentBounds = extractBoundsFromNode(current2);
        return acc2.concat(currentBounds || []);
      }, [] as any[])
    );
  }, [] as any[]);

  const transformedBounds = boundsArray.map((bounds) => {
    return {
      ...bounds,
      children: bounds.children
        ? bounds.children.map((child: any) => {
            return {
              ...child,
              bounds: transformBounds(child.bounds),
            };
          })
        : [],
      bounds: transformBounds(bounds.bounds),
    };
  });

  return transformedBounds;
}

// Helper function to extract bounds from a single node
function extractBoundsFromNode(node: Node): any | null {
  const element = node as Element;
  const tagName = element.tagName;
  const boundsString = element.getAttribute("bounds");

  if (boundsString) {
    const children = childNodesOf(node);
    const childrenBounds = children.reduce((acc, child) => {
      const childBounds = extractBoundsFromNode(child);
      return childBounds ? acc.concat(childBounds) : acc;
    }, [] as any[]);

    const bounds = {
      attributes: {
        "android:tag": element.getAttribute("android:tag"),
        "resource-id": element.getAttribute("resource-id"),
        text: element.getAttribute("text"),
        class: element.getAttribute("class"),
        contentDesc: element.getAttribute("content-desc"),
      },
      tag: tagName,
      bounds: boundsString,
      children: childrenBounds,
    };

    return bounds;
  }
  return null;
}

function transformBounds(boundsString: string): number[] {
  if (!boundsString) {
    return [];
  }

  // Bounds string should look something like [46,250][558,441]
  const boundValues = boundsString.replace(/\]\[/g, ",").replace(/\[|\]/g, "");
  const boundsArray = boundValues.split(",").map((num) => {
    return parseInt(num, 10);
  });

  return boundsArray;
}

export function findJSONElementByPath(
  path: string,
  jsonElement: JSONElement
): JSONElement | null {
  const pathParts = path.split(".");
  let currentElement: JSONElement | null = jsonElement;

  for (let i = 0; i < pathParts.length && currentElement; i++) {
    const part = pathParts[i];

    if (part === "" || (!currentElement.children && !isNaN(Number(part)))) {
      return null;
    }

    if (isNaN(Number(part))) {
      // this is a key
      const keyElement: JSONElement | undefined = currentElement.children?.find(
        (child) => {
          return child.type === part;
        }
      );
      currentElement = keyElement || null;
    } else {
      // this is an index
      const index = Number(part);
      currentElement = currentElement.children?.[index] || null;
    }
  }

  return currentElement;
}

export function findDOMNodeByPath(path: string, dom: Node): Node | null {
  const paths = path.split(".");
  let currentNode = dom;

  for (let p = 0; p < paths.length; p++) {
    // find all child nodes
    const children = childNodesOf(currentNode);

    const index = parseInt(paths[p], 10);
    if (index >= children.length) {
      return null;
    }
    currentNode = children[index];
  }
  return currentNode;
}
