export interface LanguageCommands {
    fileName: string;
    compileCmd?: string;
    runCmd: string;
}

export const LANGUAGE_COMMAND_MAP: Record<string, LanguageCommands> = {
    javascript: {
        fileName: 'main.js',
        runCmd: 'node main.js',
    },
    python: {
        fileName: 'main.py',
        runCmd: 'python3 main.py',
    },
    c: {
        fileName: 'main.c',
        compileCmd: 'gcc main.c -o main',
        runCmd: './main',
    },
    cpp: {
        fileName: 'main.cpp',
        compileCmd: 'g++ main.cpp -o main',
        runCmd: './main',
    },
    java: {
        fileName: 'Main.java',
        compileCmd: 'javac Main.java',
        runCmd: 'java Main',
    },
};
