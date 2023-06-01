#  XTSC
  
A typescript loader, bundler and compiler, that use **SWC** and **ESBUILD**.

- To install: `npm i -g xtsc` or `npm i -D xtsc`

- To use: `xtsc [action] [file|flags]` or `npx xtsc [action] [files|flags]` or `xtsc [file][flags] to run a single file`
  
  
**Actions:**

| Action | What it do |
|--------------|--|
| *blank space* | REPL |
| build `root dir/file`  `build dir/file` | Build the project |
| bundle `file`  `bundle file` | Bundle a file |
| watch `file` | Watch for changes **in .ts .mts and .cts files** |
| run `file` ***or only*** `file` | Run a **.ts**  file|
| check | Type check the whole project |
| init | Create a **tsconfig.json** file |


**Each action have certain flags:**

*Build:*
    
 - `--wTs` Will use the **Typescript** compiler, and, will make a **type check**.
 - `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search for the provided tsconfig.
 - `--minify` Will minify each *.js* file.
 - `--sourceMaps` Will save the the source map of each file.
 
 *Notes:* In the case you configure **outDir in tsconfig and use --wTs flag** don't need to provied a root dir or a build dir.

*Bundle:*
    
 - `--wTs` Will  make a **type check**
 - `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search for the provided tsconfig.
 - `--minify` Will minify the *.js* file.
 - `--sourceMaps` Will save the the source map of each file.


*Run / Watch:*
    
 - `--wTs` Will  make a before the program initialize **type check**.
 - `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search for the provided tsconfig.
 - `--noClear` Avoid clear the console when the program initialize.
  

**Notes:**
My idea, is, in the case you are using **"type": module** in your **package.json**, you import all your **.ts** files with the **.ts** extension, so, you can use **allowImportingTsExtensions** in your **tsconfig.json**.

Following this idea, also, when you build your project, **xtsc will change all the .ts extensions to .js**.

In the case you are usign **commonjs**, will works the same if you put the **.ts** extension. 

**xtsc** will respect **.mts** and **.cts** extensions!
