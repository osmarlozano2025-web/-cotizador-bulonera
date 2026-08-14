interface SectionTitleProps { title:string; description?:string; }
export function SectionTitle({title,description}:SectionTitleProps):React.JSX.Element { return <div><h2 className="text-base font-semibold">{title}</h2>{description&&<p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>; }
