export interface FileNode {
	name: string;
	path: string;
	isDirectory: boolean;
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
