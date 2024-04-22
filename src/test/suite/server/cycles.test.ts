import assert = require("assert");
import { Cycle, DescriptionDictionary, DocumentationReference, getCycles, getCommandUriToOpenDocu, Parameter, RequirementDictionary } from "../../../../server/src/cycles";
import { Locale } from "../../../../server/src/config";

suite("LS cycles", () => {
    test("getCycles()", function () {
        const cycles = getCycles(); // if json file can't be found or correctly converted, this will throw an error
        assert(cycles.length > 0);
    });

    test("getMarkUpDocUri()", async function () {
        assert.strictEqual(getCommandUriToOpenDocu(undefined), "");
        assert.strictEqual(getCommandUriToOpenDocu("12345"), `command:isg-cnc.openDocuWithId?${encodeURIComponent(JSON.stringify(["12345"]))}`);
    });

    test("Cycle Constructor", function () {
        const documentationReference = new DocumentationReference("12345", "67890");
        const descriptionDic = new DescriptionDictionary("de-DE description", "en-US description");
        // assert error if parameter is lacking
        assert.throws(() => new Cycle(<string><unknown>undefined, "media", documentationReference, descriptionDic, []));
        assert.throws(() => new Cycle("12345", <string><unknown>undefined, documentationReference, descriptionDic, []));
        // documentationReference may be undefined
        new Cycle("12345", "media", <DocumentationReference><unknown>undefined, descriptionDic, []);
        assert.throws(() => new Cycle("12345", "media", documentationReference, <DescriptionDictionary><unknown>undefined, []));
        assert.throws(() => new Cycle("12345", "media", documentationReference, descriptionDic, <Parameter[]><unknown>undefined));
    });

    test("Parameter Constructor", function () {
        const descriptionDic = new DescriptionDictionary("de-DE descirption", "en-US description");
        const requirementDic = new RequirementDictionary(0, 5, "", false, false);
        // assert error if parameter is lacking
        assert.throws(() => new Parameter(<string><unknown>undefined, "media", descriptionDic, requirementDic, [], "docuId"));
        assert.throws(() => new Parameter("12345", <string><unknown>undefined, descriptionDic, requirementDic, [], "docuId"));
        assert.throws(() => new Parameter("12345", "media", <DescriptionDictionary><unknown>undefined, requirementDic, [], "docuId"));
        assert.throws(() => new Parameter("12345", "media", descriptionDic, <RequirementDictionary><unknown>undefined, [], "docuId"));
        assert.throws(() => new Parameter("12345", "media", descriptionDic, requirementDic, <string[]><unknown>undefined, "docuId"));
        // documentationReference may be undefined
        new Parameter("12345", "media", descriptionDic, requirementDic, [], undefined);
    });

    test("Parameter.getPlaceholder()", function () {
        const descriptionDic = new DescriptionDictionary("de-DE descirption", "en-US description");
        const requirementDic1 = new RequirementDictionary(0, 10, "default", false, false);
        const requirementDic2 = new RequirementDictionary(0, 100, "default", false, false);
        const requirementDic3 = new RequirementDictionary(undefined, 100, "default", false, false);
        const requirementDic4 = new RequirementDictionary(0, undefined, "", false, false);

        assert.strictEqual(new Parameter("pName", "media", descriptionDic, requirementDic1, [], "docuId").getPlaceholder(1), "${1|0,1,2,3,4,5,6,7,8,9,10|}");
        assert.strictEqual(new Parameter("pName", "media", descriptionDic, requirementDic2, [], "docuId").getPlaceholder(1), "${1:0-100}");
        assert.strictEqual(new Parameter("pName", "media", descriptionDic, requirementDic3, [], "docuId").getPlaceholder(1), "${1:default}");
        assert.strictEqual(new Parameter("pName", "media", descriptionDic, requirementDic4, [], "docuId").getPlaceholder(1), "${1:pname}");
    });

    test("DocumentationReference Constructor", function () {
        // assert error if parameter is lacking
        assert.throws(() => new DocumentationReference(<string><unknown>undefined, "67890"));
        assert.throws(() => new DocumentationReference("12345", <string><unknown>undefined));
    });

    test("DescriptionDictionary", function () {
        const validDescriptionDic = new DescriptionDictionary("en-US description", "de-DE description");
        // assert error if parameter is lacking
        assert.throws(() => new DescriptionDictionary(<string><unknown>undefined, "de-DE description"));
        assert.throws(() => new DescriptionDictionary("en-US description", <string><unknown>undefined));
        assert.strictEqual(validDescriptionDic.getDescription(Locale.en), "en-US description");
        assert.strictEqual(validDescriptionDic.getDescription(Locale.de), "de-DE description");
    });
});