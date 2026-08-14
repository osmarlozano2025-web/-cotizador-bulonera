import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/features/auth/auth-provider";
import { appRouter } from "@/router/app-router";
import { queryClient } from "@/services/query-client";

export function App():React.JSX.Element { return <QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={appRouter}/></AuthProvider>{import.meta.env.DEV&&<ReactQueryDevtools initialIsOpen={false}/>}</QueryClientProvider>; }
