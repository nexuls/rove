export interface FileNode {
	name: string;
	path: string;
	isDirectory: boolean;
	size: number;
	mode: string;
}

export interface FileMeta {
	name: string;
	path: string;
	isDirectory: boolean;
	isSymlink: boolean;
	size: number;
	mode: string;
	modified: Date;
	created: Date;
}
