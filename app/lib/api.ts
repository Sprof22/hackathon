export const API_URL=process.env.NEXT_PUBLIC_API_URL??"http://localhost:4000/api";
export function token(){return typeof window==="undefined"?null:localStorage.getItem("loopclose_token");}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(`${API_URL}${path}`,{...options,headers:{"content-type":"application/json",...(token()?{authorization:`Bearer ${token()}`} :{}),...options.headers}});
  if(!response.ok){const payload=await response.json().catch(()=>({message:"Request failed"}));throw new Error(Array.isArray(payload.message)?payload.message.join(", "):payload.message??"Request failed");}
  return response.json();
}
