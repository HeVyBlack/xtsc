
#  XTSC

A **Typescript** loader, bundler and compiler, that use **SWC** and **ESBUILD**.

  

- To install: `npm i -g xtsc` or `npm i -D xtsc`

 - To use: `xtsc [action] [file|flags]` or `npx xtsc [action] [files|flags]` or `xtsc [file][flags] to run a single file`
 

***New:**
New command available: `xwtsc`.
What this new command does:
| Action | What it does |
|--|--|
| *blank space* | REPL |
| build | build the project |
| bundle `entry point` `output point` | bundle the project |
| watch `file` | Watch and run on changes |
| run `file` ***or only*** `file`| Run program |
| check | Type check the whole project |
| init | Create a **tsconfig.json** |


|flag| Available on |
|--|--|
| --watch | build, bundle, check |
| --args: `[args for program]` | watch, run (must be the last flag)|
| --minify | bundle |
| --tsconfig `your tsconfig.json` | every command |


The point of this new command, is to use the most Typescript's API services, so, will build using the **Typescript's Compiler**, will make **typecheck** before initialize the program, and, will use the **transpileModule method**.



**Actions:**

  

| Action | What it does |
|--------------|--|
| *blank space* | REPL |
| build `root dir`  `build dir`  *or*  `file`  `out file`| Build the project/file |
| bundle `file`  `bundle file` | Bundle a file |
| watch `file` | Watch for changes **in .ts .mts and .cts files** |
| run `file`  ***or only***  `file` | Run a **.ts** file|
| check | Type check the whole project |
| init | Create a **tsconfig.json** file |

  

**Each action has certain flags:**

  

*Build:*

-  `--wTs` Will use the **Typescript** compiler, so, also, will make a **type check**.

-  `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search and use the provided tsconfig.

-  `--minify` Will minify each *Javascript* file.

-  `--sourceMaps` Will save the the source map of each file.

-  `--watch` Watch for changes.

-  `--noClear` Avoid clearing the console when you are using the --watch flag.

*Notes:*

In the case you are using the --wTs flag, you only need to especify the **outDir in the tsconfig** (Same logic for **sourceMaps**).

For now, you can't combine --watch and --wTs with *build file*, in the future, this will be possible.

  

*Bundle:*

-  `--wTs` Will make a **type check.**

-  `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search and use the provided tsconfig.

-  `--minify` Will minify the *.js* file.

-  `--sourceMaps` Will save the source map of the file.

-  `--watch` Watch for changes.

-  `--noClear` Avoid clearing the console when you are using the --watch flag.

  

*Notes:* In the case you are using the --wTs flag, you don't have to use the --sourceMaps flag, only set to true the **sourceMap option in the tsconfig.**

  

*Run / Watch:*

-  `--wTs` Will make a before the program initializes **type check.**

-  `--tsconfig [tsconfig]` Only useful when `--wTs` is active. Will search and use the provided tsconfig.

-  `--noClear` Avoid clearing the console when the program initializes.

-  `--args= [...args]` Args for your program, this flag, must be the last flag.

*Check:*

  

-  `--watch` Watch for changes.

-  `--tsconfig [tsconfig]`Will search and use the provided tsconfig.

  

**Notes:**

My idea, is, in the case you are using **"type": "module"** in your **package.json**, you import all your **Typescript** files with **Ts extensions,** so, you can use **allowImportingTsExtensions** in your **tsconfig.json.**

  

With this idea, when you build your project, **xtsc will change all the Ts extensions to Js extensions**.

  

In the case you are using **"type": "commonjs"**, you can also import your **Typescript** files with **Ts extensions** extension, but, is not necessary.

  

**Important:**

**In the case you are using "type": "module" , xtsc will obligate you to import all your Typescript files with Ts extensions.**

  
  

**In other case, if you are using "type": "commonjs", you may not have to worry about this, but, in the case you import your Typescript files with Js extensions, xtsc will obligate you to import your files with Ts extensions.**

  

**Remember, xtsc will change the .ts | .mts | .cts extensions to .js | .mjs | .cjs extensions on build.**

  

And, **xtsc** will respect **.mts** and **.cts** extensions!