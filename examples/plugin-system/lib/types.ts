export interface Config {
	name: string;
	outDir: string;
	inputs: Record<string, string>;
}

export interface LoadedModule {
	code: string;
	outFilePath: string;
	inputFilename: string;
	inputFilePath: string;
}
