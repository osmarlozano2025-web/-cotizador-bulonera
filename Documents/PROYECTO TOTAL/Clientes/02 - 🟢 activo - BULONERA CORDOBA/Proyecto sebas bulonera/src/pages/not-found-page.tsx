import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage():React.JSX.Element { return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="text-sm font-medium text-primary">404</p><h1 className="mt-2 text-2xl font-semibold">Página no encontrada</h1><p className="mt-2 text-sm text-muted-foreground">La dirección solicitada no existe.</p><Button asChild className="mt-6"><Link to="/dashboard">Volver al dashboard</Link></Button></div></div>; }
