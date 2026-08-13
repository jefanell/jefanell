export const dynamic="force-dynamic";

const validId=/^[A-Z0-9]{3,4}$/;

export async function GET(request:Request){
  const id=new URL(request.url).searchParams.get("ids")?.trim().toUpperCase()||"KPTK";
  if(!validId.test(id))return Response.json({error:"Enter a valid 3–4 character airport identifier"},{status:400});
  try{
    const response=await fetch(`https://aviationweather.gov/api/data/airport?ids=${encodeURIComponent(id)}&format=json`,{headers:{"User-Agent":"METAR-Runway-Visualizer/1.0"},next:{revalidate:86400}});
    if(!response.ok)throw new Error(`Aviation Weather returned ${response.status}`);
    const airport=(await response.json())?.[0];
    if(!airport)throw new Error(`No airport information was returned for ${id}`);
    const runways=(airport.runways||[]).map((runway:{id:string;dimension?:string;alignment:number})=>{
      const names=runway.id.split("/");
      const first=((Number(runway.alignment)%360)+360)%360||360;
      const reciprocal=(first+180)%360||360;
      return{id:runway.id,ends:[{name:names[0],heading:first},{name:names[1]||String(Math.round(reciprocal/10)).padStart(2,"0"),heading:reciprocal}],length:Number.parseInt(runway.dimension||"0",10)||0};
    }).filter((runway:{ends:unknown[]})=>runway.ends.length===2);
    return Response.json({icaoId:airport.icaoId||id,name:String(airport.name||id).trim(),runways},{headers:{"Cache-Control":"public, max-age=3600, s-maxage=86400"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to retrieve airport information"},{status:502})}
}
