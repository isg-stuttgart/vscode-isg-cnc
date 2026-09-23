import assert = require("assert");
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { encryptFileToFile } from "../../../util/encryption/blowfish";

suite("Client encryption (Blowfish)", () => {
    let dir: string;
    setup(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), "isg-cnc-bf-"));
    });
    teardown(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    test("encrypts a block-aligned file deterministically (golden vector)", () => {
        const inputPath = path.join(dir, "in.nc");
        const outputPath = path.join(dir, "out.ecy");
        // 16 bytes = multiple of 8 -> no random padding, fully deterministic
        fs.writeFileSync(inputPath, "ABCDEFGH12345678");
        encryptFileToFile(inputPath, outputPath, "testkey1");
        const encrypted = fs.readFileSync(outputPath);
        assert.strictEqual(encrypted.length, 16);
        // golden value locks in the cipher bit-arithmetic against regressions
        assert.strictEqual(encrypted.toString("hex"), "5df9cdf6e122cba58a37d3ed94ba41fe");
    });

    test("produces the same ciphertext for the same input and key", () => {
        const inputPath = path.join(dir, "in.nc");
        const out1 = path.join(dir, "out1.ecy");
        const out2 = path.join(dir, "out2.ecy");
        fs.writeFileSync(inputPath, "SOMEDATA"); // 8 bytes, block-aligned
        encryptFileToFile(inputPath, out1, "key12345");
        encryptFileToFile(inputPath, out2, "key12345");
        assert.deepStrictEqual(fs.readFileSync(out1), fs.readFileSync(out2));
    });

    test("pads a non-block-aligned file up to the next multiple of 8", () => {
        const inputPath = path.join(dir, "in.nc");
        const outputPath = path.join(dir, "out.ecy");
        fs.writeFileSync(inputPath, "12345"); // 5 bytes -> padded to 8
        encryptFileToFile(inputPath, outputPath, "key12345");
        assert.strictEqual(fs.readFileSync(outputPath).length, 8);
    });
});
