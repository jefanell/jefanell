export const dynamic = "force-dynamic";

const validId=/^[A-Z0-9]{3,4}$/;

export async function GET(request:Request) {
  const id=new URL(request.url).searchParams.get("ids")?.trim().toUpperCase()||"KPTK";
  if(!validId.test(id))return Response.json({error:"Invalid airport identifier"},{status:400});
  try {
    const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(id)}&format=json`, {
      headers: { "User-Agent": "METAR-Runway-Visualizer/1.0" },
      next: { revalidate: 300 },
    });

    if (!response.ok) throw new Error(`Aviation Weather returned ${response.status}`);

    const observations = await response.json();
    const observation = observations?.[0];
    if (!observation) throw new Error(`No ${id} observation was returned`);

    return Response.json(observation, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to retrieve METAR" },
      { status: 502 },
    );
  }
}
