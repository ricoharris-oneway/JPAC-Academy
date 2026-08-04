export type UserRole='student'|'teacher'|'admin'|'developer';
export interface Course{id:string;title:string;icon:string;category:string;modules:number;totalXp:number;teacher:string;progress:number;currentModule:string}
export interface NavItem{label:string;path:string;icon:string;roles:UserRole[]}
