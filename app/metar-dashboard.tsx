"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

type CloudLayer = { cover: string; base?: number };
type Metar = {
  icaoId: string; reportTime: string; temp: number; dewp: number; wdir: number | string;
  wspd: number; wgst?: number; visib: string; altim: number; rawOb: string;
  clouds: CloudLayer[]; fltCat: string;
};
type TafForecast = { timeFrom:number; timeTo:number; fcstChange?:string|null; probability?:number|null; wdir?:number|null; wspd?:number|null; wgst?:number|null; visib:string|number; wxString?:string|null; clouds:CloudLayer[] };
type TafReport = { issueTime:string; rawTAF:string; fcsts:TafForecast[] };
type RunwayPair={id:string;ends:[{name:string;heading:number},{name:string;heading:number}];length:number};
type AirportInfo={icaoId:string;name:string;runways:RunwayPair[]};

const seed: Metar = {
  icaoId:"KPTK", reportTime:"2026-08-13T02:00:00.000Z", temp:22.2, dewp:20,
  wdir:240, wspd:6, visib:"10+", altim:1010.9,
  rawOb:"METAR KPTK 130153Z COR 24006KT 10SM SCT033 OVC220 22/20 A2985 RMK SLP103 T02220200",
  clouds:[{cover:"SCT",base:3300},{cover:"OVC",base:22000}], fltCat:"VFR",
};
const initialAirport=()=>typeof window==="undefined"?"KPTK":new URLSearchParams(window.location.search).get("airport")?.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)||"KPTK";

const defaultRunways:RunwayPair[] = [
  { id:"09R/27L", ends:[{name:"09R",heading:88},{name:"27L",heading:268}], length:6521 },
  { id:"09L/27R", ends:[{name:"09L",heading:88},{name:"27R",heading:268}], length:5676 },
  { id:"18/36", ends:[{name:"18",heading:172},{name:"36",heading:352}], length:2582 },
];

const coverNames:Record<string,string>={CLR:"Clear",SKC:"Clear",FEW:"Few",SCT:"Scattered",BKN:"Broken",OVC:"Overcast",VV:"Vertical visibility"};
const f=(c:number)=>Math.round((c*9)/5+32);
const inHg=(h:number)=>h/33.8639;
const angleDiff=(a:number,b:number)=>Math.abs(((a-b+540)%360)-180);
function zuluTime(date:Date){
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"UTC",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(date).map(part=>[part.type,part.value]));
  return `${parts.month} ${parts.day} ${parts.hour}:${parts.minute}`;
}

function favoredEnd(pair:RunwayPair,wind:number){return [...pair.ends].sort((a,b)=>angleDiff(wind,a.heading)-angleDiff(wind,b.heading))[0]}
function components(speed:number,wind:number,heading:number){const a=angleDiff(wind,heading)*Math.PI/180;return{head:Math.round(speed*Math.cos(a)),cross:Math.round(speed*Math.sin(a)),percent:Math.round(Math.abs(Math.sin(a))*100)}}
function forecastTime(epoch:number){const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"UTC",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(new Date(epoch*1000)).map(part=>[part.type,part.value]));return `${parts.weekday} ${parts.hour}:${parts.minute}`}
function forecastCategory(forecast:TafForecast){const vis=Number.parseFloat(String(forecast.visib))||10;const ceiling=forecast.clouds?.find(c=>c.cover==="BKN"||c.cover==="OVC"||c.cover==="VV")?.base??Infinity;if(ceiling<500||vis<1)return"LIFR";if(ceiling<1000||vis<3)return"IFR";if(ceiling<=3000||vis<=5)return"MVFR";return"VFR"}
function weatherName(code?:string|null){if(!code)return"No significant weather";return code.split(" ").map(item=>({BR:"Mist",FG:"Fog",RA:"Rain",SHRA:"Rain showers",TSRA:"Thunderstorms",SN:"Snow"}[item]||item)).join(" · ")}
function cloudCount(cover:string,compact=false){const counts:Record<string,number>=compact?{FEW:3,SCT:5,BKN:8,OVC:11,VV:11}:{FEW:6,SCT:10,BKN:15,OVC:22,VV:22};return counts[cover]??0}

function WindsockSegments({index,stiff}:{index:number;stiff:number}){
  if(index>=4)return null;
  return <i className={`sock-segment segment-${index+1} ${index<stiff?"stiff":"droop"} ${index%2===0?"orange":"white"}`}><WindsockSegments index={index+1} stiff={stiff}/></i>
}

function Windsock({speed,angle,side,size="small"}:{speed:number;angle:number;side:"left"|"right";size?:"small"|"large"}){
  const stiffSegments=Math.min(4,Math.floor(speed/3));
  const style={"--sock-angle":`${angle}deg`} as CSSProperties;
  return <div className={`windsock ${size} ${side}`} style={style} aria-label={`${speed} knot windsock, ${stiffSegments} of 4 segments inflated`}><span className="windsock-pole"/><div className="windsock-vane"><WindsockSegments index={0} stiff={stiffSegments}/></div></div>
}

function ForecastCard({forecast,index,runways}:{forecast:TafForecast;index:number;runways:RunwayPair[]}){
  const category=forecastCategory(forecast);const ceiling=forecast.clouds?.find(c=>c.cover==="BKN"||c.cover==="OVC"||c.cover==="VV")?.base;
  const direction=typeof forecast.wdir==="number"?forecast.wdir:null;const speed=forecast.wspd??0;
  const primaryRunway=[...runways].sort((a,b)=>b.length-a.length)[0]||defaultRunways[0];
  const primaryEnd=direction===null?primaryRunway.ends[1]:favoredEnd(primaryRunway,direction);
  const favored={...primaryRunway,end:primaryEnd,...components(speed,direction??primaryEnd.heading,primaryEnd.heading)};
  const crosswindLevel=direction===null?"":favored.cross>=15?"danger":favored.cross>=10?"caution":"normal";
  const relativeWind=direction===null?0:((direction-primaryEnd.heading+540)%360)-180;
  const badgeSide=relativeWind<=0?"left":"right";
  return <article className={`forecast-card ${forecast.fcstChange==="TEMPO"?"temporary":""}`}>
    <header><span className={`forecast-category ${category.toLowerCase()}`}>{category}</span><div><time>{forecastTime(forecast.timeFrom)}–{forecastTime(forecast.timeTo).replace(/^\w+\s/,"")}</time><strong>{forecast.fcstChange||`Period ${index+1}`}</strong></div></header>
    <div className={`forecast-scene ${direction!==null&&speed>0?"wind-active":""}`}>
      <div className="forecast-clouds">{forecast.clouds?.map((layer,i)=><div className={layer.cover.toLowerCase()} key={`${layer.cover}-${layer.base}-${i}`}>{Array.from({length:cloudCount(layer.cover,true)}).map((_,cloud)=><i key={cloud}/>) }<span>{layer.cover} {(layer.base||0).toLocaleString()} ft</span></div>)}</div>
      {direction!==null&&speed>0&&<div className={`forecast-wind ${crosswindLevel} badge-${badgeSide}`} style={{transform:`rotate(${direction-favored.end.heading+90}deg)`}}>{Array.from({length:19}).map((_,i)=><i key={i}/>)}</div>}
      <div className="forecast-runway"><i className="forecast-centerline"/><b>{favored.end.name}</b><div className="forecast-threshold">{Array.from({length:8}).map((_,i)=><i key={i}/>)}</div></div>
      {direction!==null&&<strong className={`forecast-crosswind ${crosswindLevel} ${badgeSide}`}><span>{favored.cross} kt</span><span>x-wind</span></strong>}
    </div>
    <div className="forecast-stats">
      <div><span>Wind</span><strong>{direction===null?"VRB":`${direction}°`} · {speed}{forecast.wgst?`G${forecast.wgst}`:""} kt</strong></div>
      <div><span>Visibility</span><strong>{forecast.visib} mi</strong></div>
      <div><span>Ceiling</span><strong>{ceiling?`${ceiling.toLocaleString()} ft`:"Unlimited"}</strong></div>
      <div><span>Weather</span><strong>{weatherName(forecast.wxString)}</strong></div>
    </div>
    <footer><span>Primary runway</span><strong>{direction===null?primaryRunway.id:favored.end.name}</strong>{forecast.fcstChange==="TEMPO"&&<em>Temporary conditions</em>}</footer>
  </article>
}

export function MetarDashboard({mirrorMode=false}:{mirrorMode?:boolean}){
  const [metar,setMetar]=useState<Metar>(seed);
  const [taf,setTaf]=useState<TafReport|null>(null);
  const [runways,setRunways]=useState<RunwayPair[]>(defaultRunways);
  const [airportName,setAirportName]=useState("Oakland County International Airport");
  const [station,setStation]=useState(initialAirport);
  const [stationInput,setStationInput]=useState(initialAirport);
  const [stationError,setStationError]=useState("");
  const [status,setStatus]=useState<"loading"|"live"|"stale">("loading");
  const [now,setNow]=useState(()=>new Date(seed.reportTime).getTime());

  const refresh=useCallback(async()=>{
    setStatus("loading");
    try{
      const query=`?ids=${encodeURIComponent(station)}`;
      const [latestResponse,tafResponse,airportResponse]=await Promise.all([fetch(`/api/metar${query}`,{cache:"no-store"}),fetch(`/api/taf${query}`,{cache:"no-store"}),fetch(`/api/airport${query}`,{cache:"no-store"})]);
      if(!latestResponse.ok||!airportResponse.ok)throw new Error("Airport or weather data unavailable");
      const [latest,airport]=await Promise.all([latestResponse.json() as Promise<Metar>,airportResponse.json() as Promise<AirportInfo>]);
      setMetar(latest);setAirportName(airport.name);setRunways(airport.runways);setStationInput(latest.icaoId||station);
      if(tafResponse.ok)setTaf(await tafResponse.json());
      else setTaf(null);
      setStationError("");setNow(Date.now());setStatus("live");
    }catch{setStationError(`No current airport data found for ${station}`);setStatus("stale")}
  },[station]);
  useEffect(()=>{refresh();const timer=window.setInterval(refresh,5*60*1000);return()=>window.clearInterval(timer)},[refresh]);

  const windDirection=typeof metar.wdir==="number"?metar.wdir:null;
  const wind=windDirection??0;
  const reportTime=new Date(metar.reportTime);
  const age=Math.max(0,Math.floor((now-reportTime.getTime())/60000));
  const ceiling=metar.clouds?.find(c=>c.cover==="BKN"||c.cover==="OVC")?.base;
  const topCover=metar.clouds?.at(-1)?.cover||"CLR";
  const runwayRows=runways.map(pair=>{const end=favoredEnd(pair,wind),parts=components(metar.wspd,wind,end.heading);return{...pair,end,...parts}});
  const metarRunways=[...runwayRows].sort((a,b)=>b.length-a.length).filter((row,index,rows)=>rows.findIndex(other=>Math.min(angleDiff(row.ends[0].heading,other.ends[0].heading),Math.abs(180-angleDiff(row.ends[0].heading,other.ends[0].heading)))<5)===index);
  const reportDate=zuluTime(reportTime);
  function changeStation(event:FormEvent<HTMLFormElement>){event.preventDefault();const next=stationInput.trim().toUpperCase();if(!/^[A-Z0-9]{3,4}$/.test(next)){setStationError("Enter a 3–4 character identifier");return}setStationError("");if(next===station)refresh();else setStation(next)}

  return <main className={`reference-page ${mirrorMode?"mirror-mode":""}`}>
    <header className="reference-header">
      <h1>METAR {metar.icaoId} <span>· {airportName}</span></h1>
      <div className="station-meta"><span>{reportDate} Z</span><span className={`station-feed ${status}`}><i/>◷&nbsp; {age}m</span><form className="station-picker" onSubmit={changeStation}><label htmlFor="airport-id">Airport</label><input id="airport-id" value={stationInput} onChange={event=>setStationInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4))} maxLength={4} autoComplete="off" spellCheck={false} aria-invalid={Boolean(stationError)}/><button type="submit">Go</button>{stationError&&<small role="alert">{stationError}</small>}</form></div>
    </header>

    <section className="summary-row" aria-label="Current conditions">
      <article className="summary-tile category-tile"><strong>{metar.fltCat}</strong><span>No warnings</span></article>
      <article className="summary-tile weather-tile"><strong><i className="weather-cloud"/>{f(metar.temp).toFixed(1)} °F</strong><span>{coverNames[topCover]||topCover}</span></article>
      <article className="summary-tile green-tile"><strong>{metar.wspd} kt</strong><span>{metar.wdir}°</span></article>
      <article className="summary-tile green-tile"><strong>{metar.visib} mi</strong><span>Visibility</span></article>
      <article className="summary-tile green-tile"><strong>{ceiling?`${ceiling.toLocaleString()} ft`:"Unlimited"}</strong><span>Ceiling</span></article>
      <article className="summary-tile"><strong>{inHg(metar.altim).toFixed(2)} inHg</strong><span>Altimeter</span></article>
    </section>

    <section className="metar-visual" aria-label="Current METAR runway visualization">
      <header><div><span>Current METAR visualization</span><strong>{metar.wdir}° at {metar.wspd}{metar.wgst?`G${metar.wgst}`:""} kt</strong></div><div><span>Visibility</span><strong>{metar.visib} mi</strong></div><div><span>Ceiling</span><strong>{ceiling?`${ceiling.toLocaleString()} ft`:"Unlimited"}</strong></div></header>
      <div className={`metar-wide-scene ${windDirection!==null&&metar.wspd>0?"wind-active":""}`}>
        {metar.clouds?.map((layer,index)=><div className={`metar-cloud-layer ${layer.cover.toLowerCase()}`} key={`${layer.cover}-${layer.base}-${index}`} style={{bottom:`${58+Math.min(34,((layer.base||0)/30000)*34)}%`}}><div>{Array.from({length:cloudCount(layer.cover)}).map((_,i)=><i key={i}/>)}</div><b>{layer.cover} {(layer.base||0).toLocaleString()} ft</b></div>)}
        <div className="metar-runway-grid">
          {metarRunways.map(row=>{const relative=windDirection===null?0:((windDirection-row.end.heading+540)%360)-180;const side=relative<=0?"left":"right";const level=row.cross>=15?"danger":row.cross>=10?"caution":"normal";return <article className="metar-runway-view" key={row.id}>
            <span className="metar-orientation">Runway {row.id}</span>
            {windDirection!==null&&metar.wspd>0&&<div className={`metar-wind ${level} badge-${side}`} style={{transform:`rotate(${windDirection-row.end.heading+90}deg)`}}>{Array.from({length:19}).map((_,i)=><i key={i}/>)}</div>}
            <div className="metar-runway-icon"><i/><b>{row.end.name}</b><div>{Array.from({length:8}).map((_,i)=><i key={i}/>)}</div></div>
            {windDirection!==null&&<strong className={`metar-crosswind ${level} ${side}`}><span>{row.cross} kt</span><span>x-wind</span></strong>}
            {windDirection!==null&&<Windsock speed={metar.wspd} angle={windDirection-row.end.heading+90} side={side==="left"?"right":"left"} size="large"/>}
            <footer><span>{row.head>=0?`${row.head} kt headwind`:`${Math.abs(row.head)} kt tailwind`}</span></footer>
          </article>})}
        </div>
      </div>
    </section>

    <section className="taf-section">
      <header className="taf-heading"><div><h2>{metar.icaoId} forecast periods</h2><span>{taf?`Issued ${zuluTime(new Date(taf.issueTime))} Z`:"No current TAF available"}</span></div><a href={`https://aviationweather.gov/data/taf/?ids=${encodeURIComponent(metar.icaoId)}&metar=0&taf=1`} target="_blank" rel="noreferrer">Official TAF ↗</a></header>
      <div className="forecast-grid">{taf?.fcsts?.length?taf.fcsts.map((forecast,index)=><ForecastCard forecast={forecast} index={index} runways={runways} key={`${forecast.timeFrom}-${forecast.timeTo}-${forecast.fcstChange}-${index}`}/>):<article className="forecast-loading">No terminal forecast is currently published for {metar.icaoId}.</article>}</div>
    </section>
  </main>
}
