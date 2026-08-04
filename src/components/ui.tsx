import type{ButtonHTMLAttributes,ReactNode}from'react';
export function Button({children,variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode;variant?:'primary'|'secondary'}){return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>}
export function Card({children,className=''}:{children:ReactNode;className?:string}){return <section className={`card ${className}`}>{children}</section>}
export function ProgressBar({value}:{value:number}){const safe=Math.min(100,Math.max(0,value));return <div className="progress"><span style={{width:`${safe}%`}}/></div>}
export function SectionHeader({title,action}:{title:string;action?:ReactNode}){return <div className="section-head"><h2>{title}</h2>{action}</div>}
