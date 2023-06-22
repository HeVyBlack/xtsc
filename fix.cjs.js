import fs from "fs/promises";

const filePath = "./bin/require.cjs";

const code = await fs.readFile(filePath, {
  encoding: "utf-8",
});

const newCode = code.replace("export {};", "");

fs.writeFile(filePath, newCode);
