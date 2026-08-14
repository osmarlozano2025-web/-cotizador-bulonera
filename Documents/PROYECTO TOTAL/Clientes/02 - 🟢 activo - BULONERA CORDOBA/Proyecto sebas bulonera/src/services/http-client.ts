export interface RequestOptions { signal?: AbortSignal; headers?: Readonly<Record<string,string>>; }
export interface HttpClient { get<TResponse>(path:string,options?:RequestOptions):Promise<TResponse>; post<TResponse,TBody>(path:string,body:TBody,options?:RequestOptions):Promise<TResponse>; }

export class UnconfiguredHttpClient implements HttpClient {
  public get<TResponse>(path:string,options?:RequestOptions):Promise<TResponse> {
    void path; void options;
    return Promise.reject(new Error("HTTP client is not configured yet."));
  }
  public post<TResponse,TBody>(path:string,body:TBody,options?:RequestOptions):Promise<TResponse> {
    void path; void body; void options;
    return Promise.reject(new Error("HTTP client is not configured yet."));
  }
}
