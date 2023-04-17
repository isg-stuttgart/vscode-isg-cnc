let cncLanguageIDs: string[] = [
    ".nc",
    ".cnc",
    ".cyc",
    ".ecy",
    ".sub",
    ".plc"
];

/**
 * Update the list of file endings which are associated with the isg-cnc language. Always includes the default endings when they are not associated with another language.
 * @param fileConfig 
 */
export async function updateFileEndings(fileConfig: any) {
    try {
        const fileAssociations = fileConfig.associations as { [key: string]: string } | [];
        // get all languageIDs which are associated with isg-cnc language
        let languageIDs: string[] = [
            ".nc",
            ".cnc",
            ".cyc",
            ".ecy",
            ".sub",
            ".plc"
        ];
        for (const [ending, association] of Object.entries(fileAssociations)) {
            // add manually associated endings
            if (association === 'isg-cnc') {
                languageIDs.push(ending.substring(1)); // remove leading *
            }
            // remove default endings which are associated with another language
            else {
                const removeID = ending.substring(1);
                languageIDs = languageIDs.filter(languageID => languageID !== removeID);
            }
        }
        cncLanguageIDs = languageIDs;
    } catch (error: any) {
        console.error(error);
    }
}

/**
 * Get the list of file endings which are associated with the isg-cnc language. 
 * @returns List of file endings which are associated with the isg-cnc language.
 */
export function getCncLanguageIDs(): string[] {
    return cncLanguageIDs;
}

/**
 * Check if the given filename has a file ending which is associated with the isg-cnc language.
 * @param filename Filename to check. 
 * @returns True if the given filename has a file ending which is associated with the isg-cnc language.
 */
export function isCncFile(filename: string): boolean {
    return cncLanguageIDs.some(languageID => filename.endsWith(languageID));
}
