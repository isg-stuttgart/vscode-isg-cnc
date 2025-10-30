/*
This file is generated, edited and provided by the [extension-ressources repository](https://github.com/isg-stuttgart/extension-ressources) and therefore should not be modified manually in other repositories.
*/
export interface JsonEntryUncompleted {
  label: string;
  linkid: string | null | undefined;
  shortDescription: Dict | null | undefined;
  sublinks: { label: Dict; linkid: string | null }[] | null | undefined;
  kind: ItemKind | null | undefined;
  completionText: string | null | undefined;
  hoverText: Dict | null | undefined;
}

export class JsonEntry implements JsonEntryUncompleted {

  label: string;
  linkid: string | null;
  shortDescription: Dict;
  sublinks: { label: Dict; linkid: string | null }[];
  kind: ItemKind;
  completionText: string;
  filterText: string | null;
  hoverText: Dict;
  hoverTrigger: string[];

  /**
   * @param label Label of the entry (unique)
   * @param linkid Id of the entries documentation url
   * @param shortDescription Short description of the entry (in de-DE and en-GB)
   * @param sublinks Array of sublinks (label and linkid) 
   * @param kind Kind of the entry (function, variable, snippet) 
   * @param completionText Text to insert as completion/snippet
   * @param hoverText Text to show in hover (in de-DE and en-GB) 
   * @param filterText Text to use for filtering the entry in the completion list (optional)
   * @param hoverTrigger Array of strings that trigger the hover (default: [label])
   */
  constructor(
    label: string,
    linkid: string | null,
    shortDescription: Dict,
    sublinks: { label: Dict; linkid: string | null }[],
    kind: ItemKind,
    completionText: string,
    hoverText: Dict,
    filterText: string | null = null,
    hoverTrigger: string[] = [label]
  ) {
    // validate inputs
    if (!label) throw new Error('Label is required on JsonEntry constructor');

    // set properties
    this.label = label;
    this.linkid = linkid || null;
    this.shortDescription = shortDescription;
    this.sublinks = sublinks;
    this.kind = kind;
    this.completionText = completionText;
    this.hoverText = hoverText;
    this.filterText = filterText;
    this.hoverTrigger = hoverTrigger;
  }

  getInfoTextWithLink(docuPath: string, locale: Locale): string {
    const infoText = this.hoverText[locale];
    const linkid = this.linkid;

    const mainLink = linkid ? `\n\n[**Documentation**](${docuPath}/${locale}/index.html#${linkid})` : '';
    const sublinks = this.sublinks && this.sublinks.length > 0 ? ("\n\n**Related Links:**\n" + this.sublinks.map(sublink => `- [${sublink.label[locale]}](${docuPath}/${locale}/index.html#${sublink.linkid})`).join('\n')) : '';
    return `${infoText}${mainLink}${sublinks}`;
  }
  /** Parses a JSON object into a JsonEntry object and throws an error if the JSON is invalid */
  static parseJson(json: any) {
    return new JsonEntry(
      json.label,
      json.linkid,
      json.shortDescription,
      json.sublinks,
      json.kind,
      json.completionText,
      json.hoverText,
      json.filterText,
      json.hoverTrigger
    );
  }
  /** Parses an array of JSON objects into an array of JsonEntry objects and throws an error if any JSON is invalid */
  static parseJsonList(rawJsonData: any[]): JsonEntry[] {
    return rawJsonData.map(json => JsonEntry.parseJson(json));
  }

  /**
   * Finds the JsonEntry which has the longest hoverTrigger surrounding the specified position. If non existent then return null.
   * @param position line and column of the hovered position (both 0-based)
   * @param line the line which we are in as string 
   * @param jsonEntries the jsonEntries which shall be checked
   * @returns the found JsonEntry or null
   */
  static findBestSurroundingEntry(position: Position, line: string, jsonEntries: JsonEntry[]): { entry: JsonEntry, startIdx: number, endIdx: number } | null {
    let best: null | {
      entry: JsonEntry;
      start: number;
      end: number;
      score: number;
    } = null;
    for (const entry of jsonEntries) {
      // check for all triggers if they have a hover trigger which contains the position and chose the longest one
      for (const trigger of entry.hoverTrigger ?? []) {
        if (!trigger) continue;
        const len = trigger.length;
        let startIdx = line.indexOf(trigger);
        while (startIdx !== -1) {
          const endIdx = startIdx + len;
          const underCursor = position.character >= startIdx && position.character < endIdx;
          // if under cursor and better than best, set as new best
          if (underCursor && (best === null || len > best.score)) {
            best = {
              entry: entry,
              start: startIdx,
              end: endIdx,
              score: len
            };
          }
          startIdx = line.indexOf(trigger, startIdx + 1);
        }
      }
    }
    if (best) {
      return {
        entry: best.entry,
        startIdx: best.start,
        endIdx: best.end
      }
    } else {
      return null
    }
  }
  /**
   * Validates the JsonEntry object and throws an error if any of the required fields are not set.
   */
  validate() {
    if (!this.label) throw new Error('Label is required on JsonEntry');
    if (!this.shortDescription) throw new Error('Short description is required on JsonEntry');
    if (!this.hoverText || !this.hoverText["de-DE"] || !this.hoverText["en-GB"]) {
      throw new Error('Hover text is required on JsonEntry');
    }
    if (!this.completionText) throw new Error('Completion text is required on JsonEntry');
    // hoverTrigger must be an array but may be empty
    if (!Array.isArray(this.hoverTrigger)) {
      throw new Error('Hover trigger must be an array on JsonEntry');
    }

  }
  /**
   * Overwrites the current JsonEntry with the values of the new json object.
   * Only the fields that are not null/undefined in the new json object will be overwritten.
   * If the new json object has a field which does not exist in the current json object, it will throw an error.
   * @param newObj The new json object to overwrite the current json object with. 
   */
  overwrite(newObj: any) {
    // if the newObj has an unexpected field, throw an error
    for (const key in newObj) {
      if (!this.hasOwnProperty(key)) {
        throw new Error(`Field ${key} does not exist in the current json object`);
      }
    }
    // overwrite
    if (newObj.label !== this.label) throw new Error('Label does not match');
    if (newObj.linkid) this.linkid = newObj.linkid;
    if (newObj.shortDescription) Dict.overwrite(this.shortDescription, newObj.shortDescription);
    // merge sublinks into current sublinks
    if (newObj.sublinks && Array.isArray(newObj.sublinks)) {
      newObj.sublinks.forEach((sublink: { label: Dict, linkid: string | null }) => {
        const index = this.sublinks.findIndex((s) => s.label.equals(sublink.label));
        if (index === -1) {
          this.sublinks.push(sublink);
        } else {
          this.sublinks[index].linkid = sublink.linkid;
        }
      });
    }
    if (newObj.kind) this.kind = newObj.kind;
    if (newObj.completionText) this.completionText = newObj.completionText;
    if (newObj.hoverText) Dict.overwrite(this.hoverText, newObj.hoverText);
    if (newObj.filterText) this.filterText = newObj.filterText;
    if (newObj.hoverTrigger) {
      if (!Array.isArray(newObj.hoverTrigger)) {
        throw new Error('Hover trigger must be an array on JsonEntry');
      }
      this.hoverTrigger = newObj.hoverTrigger;
    }
  }
}

export enum ItemKind {
  FUNCTION = "Function",
  VARIABLE = "Variable",
  SNIPPET = "Snippet",
}

export class Dict {

  "de-DE": string;
  "en-GB": string;

  constructor(de: string, en: string) {
    this["de-DE"] = de;
    this["en-GB"] = en;
  }

  equals(dict2: Dict): boolean {
    return this["de-DE"] === dict2["de-DE"] && this["en-GB"] === dict2["en-GB"];
  }
  /**
  * Overwrites the current Dict with the values of the new dict object if they are not empty.
  * @param shortDescription 
  */
  static overwrite(oldDict: Dict, newDict: Dict) {
    if (newDict["de-DE"]) oldDict["de-DE"] = newDict["de-DE"];
    if (newDict["en-GB"]) oldDict["en-GB"] = newDict["en-GB"];
  }
}

export enum TableKind {
  ALL_ELEMENTS,
  SKIP_TITLE
}
export enum Locale {
  en = "en-GB",
  de = "de-DE"
}

/**
 * A position in a text document expressed as zero-based line and character offset.
 */
export class Position {
  /** The line number of the position (zero-based). */
  line: number;
  /** The character offset of the position (zero-based). */
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}