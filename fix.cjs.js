import fs from "fs/promises";

const filePath = "./build/require.cjs";

const code = await fs.readFile(filePath, {
  encoding: "utf-8",
});

const newCode = code.replace("export {};", "");

fs.writeFile(filePath, newCode);
