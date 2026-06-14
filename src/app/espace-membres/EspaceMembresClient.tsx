"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────── */
type Panel = "accueil"|"messagerie"|"agenda"|"streaming"|"priere"|"contacts"|"presences"|"activites"|"dons"|"admin";
type BTab  = "verset"|"lecteur"|"etude"|"theo"|"mur"|"plans"|"notes";
type ATab  = "membres"|"groupes"|"visiteurs"|"crm"|"support"|"sermons"|"stats";

interface Profile {
  id:string; first_name:string|null; last_name:string|null;
  email:string; role:string; validated:boolean;
  groups:string[]|null; avatar_url:string|null;
}
interface Evt { id:string; title:string; date:string; time_start:string|null; location:string|null; }
interface Prayer { id:string; user_id:string; title:string; description:string|null; is_anonymous:boolean; is_answered:boolean; prayer_count:number; created_at:string; profiles?:{first_name:string|null;last_name:string|null}|null; }
interface Member { id:string; first_name:string|null; last_name:string|null; email:string; role:string; validated:boolean; phone:string|null; groups:string[]|null; created_at:string; }

export interface EMClientProps {
  profile: Profile|null;
  userId:  string;
  membresCount: number;
  events:  Evt[];
}

/* ─── Static data ────────────────────────────────────────────────── */
const BOOKS = [
  {n:"Genèse",c:50},{n:"Exode",c:40},{n:"Lévitique",c:27},{n:"Nombres",c:36},{n:"Deutéronome",c:34},
  {n:"Josué",c:24},{n:"Juges",c:21},{n:"Ruth",c:4},{n:"1 Samuel",c:31},{n:"2 Samuel",c:24},
  {n:"1 Rois",c:22},{n:"2 Rois",c:25},{n:"1 Chroniques",c:29},{n:"2 Chroniques",c:36},
  {n:"Esdras",c:10},{n:"Néhémie",c:13},{n:"Esther",c:10},{n:"Job",c:42},{n:"Psaumes",c:150},
  {n:"Proverbes",c:31},{n:"Ecclésiaste",c:12},{n:"Cantique",c:8},{n:"Ésaïe",c:66},
  {n:"Jérémie",c:52},{n:"Lamentations",c:5},{n:"Ézéchiel",c:48},{n:"Daniel",c:12},
  {n:"Osée",c:14},{n:"Joël",c:3},{n:"Amos",c:9},{n:"Abdias",c:1},{n:"Jonas",c:4},
  {n:"Michée",c:7},{n:"Nahoum",c:3},{n:"Habacuc",c:3},{n:"Sophonie",c:3},{n:"Aggée",c:2},
  {n:"Zacharie",c:14},{n:"Malachie",c:4},
  {n:"Matthieu",c:28},{n:"Marc",c:16},{n:"Luc",c:24},{n:"Jean",c:21},{n:"Actes",c:28},
  {n:"Romains",c:16},{n:"1 Corinthiens",c:16},{n:"2 Corinthiens",c:13},{n:"Galates",c:6},
  {n:"Éphésiens",c:6},{n:"Philippiens",c:4},{n:"Colossiens",c:4},{n:"1 Thessaloniciens",c:5},
  {n:"2 Thessaloniciens",c:3},{n:"1 Timothée",c:6},{n:"2 Timothée",c:4},{n:"Tite",c:3},
  {n:"Philémon",c:1},{n:"Hébreux",c:13},{n:"Jacques",c:5},{n:"1 Pierre",c:5},
  {n:"2 Pierre",c:3},{n:"1 Jean",c:5},{n:"2 Jean",c:1},{n:"3 Jean",c:1},{n:"Jude",c:1},
  {n:"Apocalypse",c:22},
];
const TRANS = [
  {code:"lsg",label:"Louis Segond (1910)"},{code:"neg",label:"Nouv. Éd. Genève"},
  {code:"fob",label:"Français Courant"},{code:"kjv",label:"King James Version"},
  {code:"bbe",label:"Bible Basic English"},{code:"niv",label:"NIV"},{code:"esv",label:"ESV"},
];
const VERSET = { text:"Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", ref:"Jean 3:16" };
const PLAN_LECTURE = [
  {ref:"Genèse 1-2",done:true},{ref:"Genèse 3-4",done:true},{ref:"Psaume 1-5",done:true},
  {ref:"Matthieu 1-4",done:false},{ref:"Jean 1-3",done:false},{ref:"Romains 1-3",done:false},
];
const THEO_CATS = [
  { id:"conf", title:"Confessions de Foi", icon:"📜", items:[
    {id:"westminster",title:"Confession de Westminster (1646)",sub:"Document fondateur du calvinisme presbytérien"},
    {id:"heidelberg",title:"Catéchisme de Heidelberg (1563)",sub:"129 questions sur la foi réformée"},
    {id:"nicee",title:"Credo de Nicée (381 ap. J.-C.)",sub:"Le symbole de foi œcuménique universel"},
    {id:"apostles",title:"Symbole des Apôtres",sub:"Résumé fondamental de la foi chrétienne"},
  ]},
  { id:"doct", title:"Doctrines Fondamentales", icon:"⛪", items:[
    {id:"trinite",title:"La Trinité — Père, Fils, Saint-Esprit",sub:"Doctrine centrale du christianisme orthodoxe"},
    {id:"salvation",title:"La Sotériologie — Doctrine du Salut",sub:"Grâce, foi, justification, sanctification"},
    {id:"eschat",title:"L'Eschatologie — Les Dernières Choses",sub:"Résurrection, jugement, cieux, enfer"},
    {id:"eccles",title:"L'Ecclésiologie — Doctrine de l'Église",sub:"Nature, mission et gouvernement de l'Église"},
  ]},
  { id:"herm", title:"Herméneutique & Exégèse", icon:"🔍", items:[
    {id:"herm1",title:"Principes d'Interprétation Biblique",sub:"Méthodes grammatico-historiques et contextuelles"},
    {id:"types",title:"Typologies et Figures Prophétiques",sub:"L'AT préfigurant le NT"},
    {id:"genres",title:"Genres Littéraires de la Bible",sub:"Poésie, prophétie, apocalyptique, épître"},
  ]},
  { id:"hist", title:"Histoire de l'Église", icon:"🏛️", items:[
    {id:"peres",title:"Les Pères de l'Église (I–IV siècle)",sub:"Irénée, Tertullien, Origène, Augustin..."},
    {id:"reform",title:"La Réformation (XVI siècle)",sub:"Luther, Calvin, Zwingli et leurs contributions"},
    {id:"missions",title:"L'Ère Missionnaire (XIX–XX siècle)",sub:"William Carey, Hudson Taylor, missions en Afrique"},
  ]},
];
const ONLINE_MEMBERS = [
  {name:"Jaise Buka",role:"admin",color:"#1e2464"},{name:"Pedro Obova",role:"pasteur",color:"#276749"},
  {name:"Marie Kalinda",role:"membre",color:"#9d174d"},{name:"Samuel Nkosi",role:"membre",color:"#1e40af"},
  {name:"Grace Mbeki",role:"membre",color:"#3730a3"},{name:"David Lumbala",role:"membre",color:"#065f46"},
];
const ACTIVITIES = [
  {icon:"🙏",text:"Marie Kalinda a ajouté une demande de prière",time:"il y a 5 min"},
  {icon:"✅",text:"Samuel Nkosi a rejoint le groupe Jeunesse",time:"il y a 20 min"},
  {icon:"💬",text:"Nouveau message dans #général",time:"il y a 45 min"},
  {icon:"📅",text:"Culte du dimanche confirmé — 120 présences",time:"il y a 2h"},
  {icon:"🎵",text:"Groupe Chorale : répétition ajoutée au calendrier",time:"il y a 3h"},
  {icon:"💰",text:"Don reçu : 150 CHF (TWINT)",time:"il y a 5h"},
  {icon:"👥",text:"David Lumbala a créé un nouveau contact",time:"hier"},
  {icon:"📺",text:"Sermon du 08 juin disponible en rediffusion",time:"il y a 2j"},
];
const DONS_RECENTS = [
  {name:"Anonyme",amount:"200 CHF",method:"TWINT",date:"10.06.2026"},
  {name:"Marie K.",amount:"150 CHF",method:"Stripe",date:"08.06.2026"},
  {name:"Samuel N.",amount:"100 CHF",method:"PostFinance",date:"05.06.2026"},
  {name:"Anonyme",amount:"500 CHF",method:"Virement",date:"01.06.2026"},
];
const GROUPES = [
  {name:"Pasteurs & Anciens",count:4,icon:"⛪",color:"#92400e"},
  {name:"Médias & Communication",count:8,icon:"📺",color:"#1e40af"},
  {name:"Chorale & Louange",count:18,icon:"🎵",color:"#9d174d"},
  {name:"Jeunesse ARC",count:32,icon:"🌱",color:"#065f46"},
  {name:"Femmes ARC",count:28,icon:"💐",color:"#831843"},
  {name:"Action Sociale",count:12,icon:"❤️",color:"#3730a3"},
  {name:"Sanitaire & Accueil",count:9,icon:"🏥",color:"#991b1b"},
  {name:"École du Dimanche",count:15,icon:"📚",color:"#854d0e"},
  {name:"Suivi & Accompagnement",count:7,icon:"🤝",color:"#5b21b6"},
  {name:"Administration",count:3,icon:"⚙️",color:"#4a5568"},
  {name:"Support Technique",count:2,icon:"💻",color:"#2d3748"},
];
const CRM_COLS = [
  {title:"Visiteurs",color:"#8890aa",cards:[{name:"Thomas Kanza",note:"Venu 3x ce mois"},{name:"Isabelle Moyo",note:"Contact téléphonique"}]},
  {title:"En suivi",color:"#c05621",cards:[{name:"Pierre Nsamba",note:"Prière accompagnement"},{name:"Anne Diallo",note:"Rencontre prévue"}]},
  {title:"En intégration",color:"#1e40af",cards:[{name:"Ruth Kasongo",note:"Groupe jeunesse"},{name:"Marc Benga",note:"Baptême planifié"}]},
  {title:"Membres actifs",color:"#065f46",cards:[{name:"Élie Mwamba",note:"Groupe médias"},{name:"Sarah Bula",note:"École du dimanche"}]},
];
const ETUDE_DB: Record<string,{ref:string;contexte:string;theologie:string;application:string}> = {
  "Jean 3:16":{ref:"Jean 3:16",
    contexte:"Jésus parle à Nicodème, un pharisien qui vient le trouver de nuit. Ce verset est au cœur d'une conversation sur la naissance spirituelle (Jean 3:1-21). Le contexte immédiat est une allusion à Nombres 21 (le serpent d'airain élevé dans le désert).",
    theologie:"Ce verset révèle quatre vérités théologiques majeures : (1) L'amour universel de Dieu (kosmos = toute l'humanité), (2) Le don du Fils unique (monogenēs - unicité ontologique), (3) La condition de la foi (pisteuōn - foi active et persévérante), (4) Le double résultat : ne pas périr / vie éternelle.",
    application:"La réponse appropriée à cet amour est la foi. Non pas une foi intellectuelle seulement, mais une foi qui s'engage, qui remet sa vie à Christ. Pour l'église locale, cela signifie : proclamer cet Évangile universellement accessible."
  },
  "Romains 8:28":{ref:"Romains 8:28",
    contexte:"Dans le chapitre 8 de Romains, Paul présente la vie dans l'Esprit (versets 1-17), la gloire future (18-25), l'intercession de l'Esprit (26-27), avant cette affirmation fondamentale sur la souveraineté de Dieu (28-30).",
    theologie:"'Toutes choses' (panta) inclut aussi les épreuves et souffrances. 'Ceux qui aiment Dieu' = les croyants. 'Appelés selon son dessein' = la vocation élective de Dieu. Cette promesse s'inscrit dans la chaîne de salut des versets 29-30 (prescience → prédestination → appel → justification → glorification).",
    application:"Cette vérité produit la paix dans la souffrance, la confiance dans l'incertitude et la persévérance dans l'épreuve. Elle n'est pas un déni de la douleur mais une affirmation que Dieu reste souverain et bon."
  },
};

/* ─── Component ──────────────────────────────────────────────────── */
export default function EspaceMembresClient({ profile, userId, membresCount, events }: EMClientProps) {
  const supabase = createClient();

  /* Nav */
  const [panel, setPanel]     = useState<Panel>("accueil");
  const [toast, setToast]     = useState<string|null>(null);

  /* Header */
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* Modals */
  const [showGS, setShowGS] = useState(false);
  const [showGD, setShowGD] = useState(false);
  const [showNewPrayer, setShowNewPrayer] = useState(false);

  /* Bible */
  const [bTab, setBTab]         = useState<BTab>("verset");
  const [bBook, setBBook]       = useState(42);   // Jean = index 42 (0-based)
  const [bCh, setBCh]           = useState(3);
  const [bTrans, setBTrans]     = useState("lsg");
  const [bVerses, setBVerses]   = useState<{verse:number;text:string}[]>([]);
  const [bLoading, setBLoading] = useState(false);
  const [bHl, setBHl]           = useState<number|null>(null);
  const [theoCat, setTheoCat]   = useState("conf");
  const [theoItem, setTheoItem] = useState<string|null>(null);
  const [etudeRef, setEtudeRef] = useState("Jean 3:16");
  const [planDone, setPlanDone] = useState<number[]>([0,1,2]);

  /* Prayers */
  const [prayers, setPrayers]     = useState<Prayer[]>([]);
  const [pLoading, setPLoading]   = useState(false);
  const [pTitle, setPTitle]       = useState("");
  const [pDesc, setPDesc]         = useState("");
  const [pAnon, setPAnon]         = useState(false);
  const [pSubmitting, setPSubmit] = useState(false);

  /* Members (admin) */
  const [members, setMembers]     = useState<Member[]>([]);
  const [mSearch, setMSearch]     = useState("");
  const [mLoading, setMLoading]   = useState(false);
  const [adminTab, setAdminTab]   = useState<ATab>("membres");

  /* Messagerie */
  const [msgChan, setMsgChan]     = useState("général");
  const [msgInput, setMsgInput]   = useState("");
  const [messages, setMessages]   = useState([
    {id:"1",from:"Pedro Obova",text:"Bonjour à tous ! Le culte de dimanche sera à 9h30.",mine:false,time:"9:15"},
    {id:"2",from:"Marie Kalinda",text:"Merci Pasteur ! Je confirme ma présence 🙏",mine:false,time:"9:18"},
    {id:"3",from:"Moi",text:"Bonjour ! Est-ce que la chorale est prévue ce dimanche ?",mine:true,time:"9:22"},
    {id:"4",from:"Samuel Nkosi",text:"Oui, la chorale sera présente ! Répétition à 8h45.",mine:false,time:"9:24"},
  ]);
  const msgEndRef = useRef<HTMLDivElement>(null);

  /* Agenda */
  const [calMonth, setCalMonth]   = useState(5); // June (0-indexed)
  const [calYear, setCalYear]     = useState(2026);

  /* Contacts */
  const [cSearch, setCSearch]     = useState("");

  /* Dons */
  const [donAmt, setDonAmt]       = useState(100);
  const [donCustom, setDonCustom] = useState("");
  const [donMethod, setDonMethod] = useState("twint");
  const [donLabel, setDonLabel]   = useState("Dîme");

  /* Countdown */
  const [countdown, setCountdown] = useState("");

  /* Computed */
  const role        = profile?.role ?? "visiteur";
  const isAdmin     = role === "admin";
  const isPasteur   = role === "pasteur";
  const canAdmin    = isAdmin || isPasteur;
  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email
    : "Membre";
  const initiale    = (profile?.first_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase();
  const canPost     = profile?.validated || ["admin","pasteur"].includes(role) || profile?.groups?.includes("support");

  /* ── Effects ─────────────────────────────────────────────────── */
  useEffect(() => {
    const tick = () => {
      const now  = new Date();
      const d    = now.getDay();
      const diff = (d === 0 ? 7 : 7 - d);
      const next = new Date(now);
      next.setDate(now.getDate() + diff);
      next.setHours(9, 30, 0, 0);
      const ms = next.getTime() - now.getTime();
      const dd = Math.floor(ms / 86400000);
      const hh = Math.floor((ms % 86400000) / 3600000);
      const mm = Math.floor((ms % 3600000) / 60000);
      const ss = Math.floor((ms % 60000) / 1000);
      setCountdown(`${dd}j ${hh}h ${String(mm).padStart(2,"0")}m ${String(ss).padStart(2,"0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  useEffect(() => {
    if (panel === "priere" && bTab === "mur") loadPrayers();
  }, [panel, bTab]);

  useEffect(() => {
    if (panel === "admin" && adminTab === "membres" && members.length === 0) loadMembers();
  }, [panel, adminTab]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Bible loader ────────────────────────────────────────────── */
  const loadChapter = useCallback(async (bookIdx: number, ch: number, trans: string) => {
    setBLoading(true);
    setBVerses([]);
    try {
      const bookNum = bookIdx + 1;
      const res  = await fetch(`https://api.getbible.net/v2/${trans}/${bookNum}/${ch}.json`);
      const data = await res.json();
      if (data.verses) {
        const arr = Array.isArray(data.verses)
          ? data.verses.map((v: {verse:number;text:string}) => ({ verse: v.verse, text: v.text.trim() }))
          : Object.values(data.verses).map((v: unknown) => {
              const vv = v as {verse:number;text:string};
              return { verse: vv.verse, text: vv.text.trim() };
            });
        setBVerses(arr);
      }
    } catch { setBVerses([]); }
    finally   { setBLoading(false); }
  }, []);

  useEffect(() => {
    if (bTab === "lecteur") loadChapter(bBook, bCh, bTrans);
  }, [bBook, bCh, bTrans, bTab, loadChapter]);

  /* ── Data fetchers ───────────────────────────────────────────── */
  async function loadPrayers() {
    setPLoading(true);
    const { data } = await supabase
      .from("prayer_requests")
      .select("*, profiles(first_name, last_name)")
      .order("created_at", { ascending: false });
    setPrayers((data ?? []) as Prayer[]);
    setPLoading(false);
  }

  async function submitPrayer() {
    if (!pTitle.trim()) return;
    setPSubmit(true);
    await supabase.from("prayer_requests").insert({
      user_id: userId, title: pTitle.trim(),
      description: pDesc.trim() || null, is_anonymous: pAnon,
    });
    await loadPrayers();
    setPTitle(""); setPDesc(""); setPAnon(false);
    setShowNewPrayer(false); setToast("Demande de prière envoyée 🙏");
    setPSubmit(false);
  }

  async function prayFor(id: string) {
    const prayer = prayers.find(p => p.id === id);
    if (!prayer) return;
    await supabase.from("prayer_requests").update({ prayer_count: prayer.prayer_count + 1 }).eq("id", id);
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, prayer_count: p.prayer_count + 1 } : p));
    setToast("Tu as prié pour cette demande 🙏");
  }

  async function markAnswered(id: string) {
    await supabase.from("prayer_requests").update({ is_answered: true }).eq("id", id);
    setPrayers(prev => prev.map(p => p.id === id ? { ...p, is_answered: true } : p));
    setToast("Prière marquée comme exaucée ✅");
  }

  async function loadMembers() {
    setMLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, role, validated, phone, groups, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setMembers((data ?? []) as Member[]);
    setMLoading(false);
  }

  function sendMsg() {
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(), from: "Moi",
      text: msgInput.trim(), mine: true,
      time: new Date().toLocaleTimeString("fr-CH", { hour:"2-digit", minute:"2-digit" }),
    }]);
    setMsgInput("");
  }

  /* ── Navigation helper ───────────────────────────────────────── */
  function nav(p: Panel) {
    setPanel(p);
    if (p === "priere") setBTab("mur");
  }

  /* ── Calendar helper ─────────────────────────────────────────── */
  function buildCalendar(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month, 0).getDate();
    const cells: { day: number; type: "prev"|"curr"|"next"; hasEvt?: boolean }[] = [];
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: "prev" });
    const today = new Date();
    const eventDays = events
      .filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
      .map(e => new Date(e.date).getDate());
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "curr", hasEvt: eventDays.includes(d) });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, type: "next" });
    return { cells, today: today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1 };
  }

  const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const { cells, today: todayDay } = buildCalendar(calYear, calMonth);

  /* ── Sidebar nav items ───────────────────────────────────────── */
  type NavItem = { id:string; lbl:string; ico:string; badge?:number; live?:boolean; count?:number; };
  type NavGroup = { section:string; items:NavItem[] };
  const NAV_ITEMS: NavGroup[] = [
    { section:"Principal", items:[
      { id:"accueil",    lbl:"Accueil",        ico:"⌂" },
      { id:"messagerie", lbl:"Messagerie",     ico:"✉",  badge:5 },
      { id:"agenda",     lbl:"Agenda",         ico:"◉" },
      { id:"streaming",  lbl:"Streaming",      ico:"▶",  live:true },
      { id:"priere",     lbl:"Prière & Bible", ico:"✦" },
    ]},
    { section:"Communauté", items:[
      { id:"contacts",   lbl:"Contacts",       ico:"👥", count:membresCount },
      { id:"presences",  lbl:"Présences",      ico:"✓" },
      { id:"activites",  lbl:"Activités",      ico:"◈",  badge:7 },
    ]},
    { section:"Gestion", items:[
      { id:"dons",       lbl:"Dons & Paiements",ico:"♡" },
      ...(canAdmin ? [{ id:"admin", lbl:"Administration", ico:"⚙" }] : []),
    ]},
  ];

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="em-app">

      {/* ╔══════ HEADER ══════╗ */}
      <header className="em-hdr">
        <a href="/" className="em-logo">
          <div className="em-logo-icon">ARC</div>
          <div>
            <div style={{lineHeight:1.1}}>ARC <span style={{color:"#8899cc",fontWeight:400}}>Ambassade</span></div>
            <div style={{fontSize:9,color:"#8890aa",fontFamily:"Outfit,sans-serif",letterSpacing:".08em",textTransform:"uppercase"}}>Espace Membres</div>
          </div>
        </a>

        <button className="em-search" style={{cursor:"text",textAlign:"left",border:"1.5px solid rgba(30,36,100,.12)"}}
          onClick={() => setShowSearch(true)}>
          🔍&nbsp; Rechercher…
        </button>

        <div className="em-hdr-meta">
          <span style={{fontSize:12,color:"#8890aa",whiteSpace:"nowrap"}}>
            <span className="em-dot-green" style={{display:"inline-block",marginRight:5,verticalAlign:"middle"}} />
            {ONLINE_MEMBERS.length} en ligne
          </span>
          <span style={{fontSize:12,color:"#8890aa",whiteSpace:"nowrap"}}>
            {new Date().toLocaleDateString("fr-CH",{weekday:"short",day:"numeric",month:"short"})}
          </span>
          {canAdmin && (
            <button className="em-hdr-ico" title="Gestion Stream" onClick={() => setShowGS(true)}>📡</button>
          )}
          <button className="em-hdr-ico" title="Notifications">
            🔔
            <span className="em-hdr-dot" />
          </button>
          <div
            className="em-av" style={{width:32,height:32,fontSize:12,cursor:"pointer"}}
            onClick={() => setPanel("accueil")}
          >
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt="" width={32} height={32} />
              : initiale}
          </div>
        </div>
      </header>

      <div className="em-body">

        {/* ╔══════ SIDEBAR ══════╗ */}
        <aside className="em-sb">
          <div style={{flex:1,paddingTop:8}}>
            {NAV_ITEMS.map(group => (
              <div key={group.section}>
                <div className="em-sb-section">{group.section}</div>
                {group.items.map(item => (
                  <button key={item.id} className={`em-ni${panel === item.id ? " active" : ""}`}
                    onClick={() => nav(item.id as Panel)}>
                    <span className="em-ni-ico">{item.ico}</span>
                    <span className="em-ni-lbl">{item.lbl}</span>
                    {"badge" in item && item.badge
                      ? <span className="em-badge">{item.badge}</span>
                      : "count" in item && item.count
                        ? <span className="em-badge-soft">{item.count}</span>
                        : "live" in item && item.live
                          ? <span className="em-live">LIVE</span>
                          : null}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <hr className="em-sb-sep" />
          <a href="/espace-membres/profil" className="em-sb-user">
            <div className="em-av" style={{width:34,height:34,fontSize:12}}>
              {profile?.avatar_url
                ? <Image src={profile.avatar_url} alt="" width={34} height={34} />
                : initiale}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                <span className="em-dot-green" style={{display:"inline-block",marginRight:4,verticalAlign:"middle"}} />
                {role}
              </div>
            </div>
          </a>
          <button className="em-ni" style={{margin:"4px 8px 12px",color:"rgba(255,255,255,.35)",fontSize:12}}
            onClick={async()=>{ await fetch("/api/auth/signout"); window.location.href="/"; }}>
            <span className="em-ni-ico" style={{fontSize:12}}>←</span>
            <span>Déconnexion</span>
          </button>
        </aside>

        {/* ╔══════ MAIN ══════╗ */}
        <main className="em-main">

          {/* ── ACCUEIL ─────────────────────────────────────── */}
          <div className={`em-panel${panel==="accueil"?" active":""}`}>
            <div className="em-sect-title">Bonjour, {profile?.first_name ?? "ami(e)"} 👋</div>
            <div className="em-sect-sub">
              {new Date().toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </div>

            {/* Stats */}
            <div className="em-g4" style={{marginBottom:18}}>
              {[
                {num:membresCount,lbl:"Membres"},
                {num:42,lbl:"Prières actives"},
                {num:247,lbl:"Spectateurs live"},
                {num:"4 820 CHF",lbl:"Dons ce mois"},
              ].map(s => (
                <div key={s.lbl} className="em-card-sm" style={{textAlign:"center"}}>
                  <div className="em-stat-num">{s.num}</div>
                  <div className="em-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Verse + Culte */}
            <div className="em-g2" style={{marginBottom:18}}>
              <div className="em-card-dark">
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".09em",color:"rgba(255,255,255,.4)",marginBottom:10}}>✦ Verset du jour</div>
                <div className="em-verset-card">&ldquo;{VERSET.text}&rdquo;</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:8,fontFamily:"Outfit,sans-serif"}}>— {VERSET.ref}</div>
              </div>
              <div className="em-card" style={{background:"#fff0f0",border:"1px solid #fde8e8"}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".09em",color:"#e53e3e",marginBottom:10}}>⏱ Prochain culte</div>
                <div style={{fontSize:11,color:"#8890aa",marginBottom:4}}>Dimanche à 9h30 · La Chaux-de-Fonds</div>
                <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:28,fontWeight:700,color:"#1e2464",lineHeight:1.1,marginTop:8}}>{countdown || "Chargement…"}</div>
                <button className="em-btn em-btn-primary em-btn-sm" style={{marginTop:12}} onClick={() => nav("streaming")}>Voir le streaming ▶</button>
              </div>
            </div>

            {/* Events + Groupes */}
            <div className="em-g2">
              <div className="em-card">
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e2464"}}>📅 Prochains événements</div>
                {events.length > 0 ? events.slice(0,4).map(ev => (
                  <div key={ev.id} style={{display:"flex",gap:12,paddingBottom:12,borderBottom:"1px solid rgba(30,36,100,.07)",marginBottom:12}}>
                    <div style={{textAlign:"center",minWidth:36}}>
                      <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464",lineHeight:1}}>{new Date(ev.date).getDate()}</div>
                      <div style={{fontSize:9,color:"#8899cc",fontWeight:700,textTransform:"uppercase"}}>{new Date(ev.date).toLocaleDateString("fr-CH",{month:"short"})}</div>
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1a1d3a"}}>{ev.title}</div>
                      <div style={{fontSize:11,color:"#8890aa"}}>{ev.time_start?.slice(0,5)} · {ev.location}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{textAlign:"center",padding:"20px 0",color:"#8890aa",fontSize:13}}>Aucun événement à venir</div>
                )}
                <button className="em-btn em-btn-outline em-btn-sm" style={{width:"100%"}} onClick={() => nav("agenda")}>Voir l&apos;agenda complet →</button>
              </div>
              <div className="em-card">
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e2464"}}>👥 Mes groupes</div>
                {(profile?.groups ?? []).length > 0
                  ? (profile?.groups ?? []).map(g => (
                    <div key={g} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                      <span className="em-gc" style={{background:"#eef1f8",color:"#1e2464"}}>{g}</span>
                    </div>
                  ))
                  : <div style={{color:"#8890aa",fontSize:13}}>Aucun groupe assigné pour l&apos;instant.</div>}
                <div style={{marginTop:16,fontSize:12,color:"#8890aa"}}>Plan de lecture</div>
                {PLAN_LECTURE.slice(0,3).map((p,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:13}}>
                    <div style={{width:16,height:16,border:"2px solid",borderColor:planDone.includes(i)?"#1e2464":"#cbd5e0",borderRadius:4,background:planDone.includes(i)?"#1e2464":"transparent",flexShrink:0,cursor:"pointer"}}
                      onClick={() => setPlanDone(d => d.includes(i) ? d.filter(x=>x!==i) : [...d,i])} />
                    <span style={{textDecoration:planDone.includes(i)?"line-through":"none",color:planDone.includes(i)?"#8890aa":"#1a1d3a"}}>{p.ref}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MESSAGERIE ──────────────────────────────────── */}
          <div className={`em-panel${panel==="messagerie"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div><div className="em-sect-title">Messagerie</div><div className="em-sect-sub">Canaux & messages directs</div></div>
            </div>
            <div className="em-chat">
              <div className="em-channels">
                <div className="em-ch-sec">Canaux</div>
                {["général","prière","annonces","jeunesse","louange"].map(ch => (
                  <button key={ch} className={`em-ch-item${msgChan===ch?" active":""}`} onClick={() => setMsgChan(ch)}>
                    <span style={{color:"#8890aa"}}>#</span> {ch}
                    {ch==="général" && <span className="em-badge" style={{marginLeft:"auto"}}>3</span>}
                  </button>
                ))}
                <div className="em-ch-sec" style={{marginTop:8}}>Messages directs</div>
                {ONLINE_MEMBERS.slice(0,4).map(m => (
                  <button key={m.name} className="em-ch-item" onClick={() => setMsgChan(m.name)}>
                    <div className="em-av" style={{width:20,height:20,fontSize:9,background:m.color}}>{m.name[0]}</div>
                    <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                    <span className="em-dot-green" />
                  </button>
                ))}
              </div>
              <div className="em-conv">
                <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(30,36,100,.08)",fontWeight:600,fontSize:13,color:"#1e2464"}}>
                  # {msgChan}
                </div>
                <div className="em-msgs">
                  {messages.map(m => (
                    <div key={m.id} className={`em-msg${m.mine?" mine":""}`}>
                      {!m.mine && <div className="em-av" style={{width:30,height:30,fontSize:11,background:"#1e2464"}}>{m.from[0]}</div>}
                      <div>
                        {!m.mine && <div style={{fontSize:11,fontWeight:600,color:"#1e2464",marginBottom:2}}>{m.from}</div>}
                        <div className="em-bubble">{m.text}</div>
                        <div style={{fontSize:10,color:"#8890aa",marginTop:2,textAlign:m.mine?"right":"left"}}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>
                <div className="em-msg-bar">
                  <textarea className="em-msg-input" rows={1} placeholder={`Message #${msgChan}…`}
                    value={msgInput} onChange={e=>setMsgInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();} }} />
                  <button className="em-btn em-btn-primary em-btn-sm" onClick={sendMsg}>Envoyer</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── AGENDA ──────────────────────────────────────── */}
          <div className={`em-panel${panel==="agenda"?" active":""}`}>
            <div className="em-sect-title">Agenda</div>
            <div className="em-sect-sub">Événements & calendrier de l'église</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:20}}>
              <div className="em-card">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <button className="em-btn em-btn-ghost em-btn-sm" onClick={() => {
                    if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);
                  }}>‹</button>
                  <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:18,fontWeight:700,color:"#1e2464"}}>
                    {MONTHS_FR[calMonth]} {calYear}
                  </div>
                  <button className="em-btn em-btn-ghost em-btn-sm" onClick={() => {
                    if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);
                  }}>›</button>
                </div>
                <div className="em-cal-head">
                  {DAYS_FR.map(d => <div key={d} className="em-cal-dh">{d}</div>)}
                </div>
                <div className="em-cal-grid">
                  {cells.map((cell,i) => (
                    <div key={i}
                      className={`em-cal-cell${cell.type!=="curr"?" other-m":""}${cell.day===todayDay&&cell.type==="curr"?" today":""}${cell.hasEvt?" has-evt":""}`}>
                      {cell.day}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#1e2464",marginBottom:10}}>Événements à venir</div>
                {events.length > 0 ? events.map(ev => (
                  <div key={ev.id} className="em-card-sm" style={{marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#1e2464"}}>{ev.title}</div>
                    <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>
                      {new Date(ev.date).toLocaleDateString("fr-CH")} · {ev.time_start?.slice(0,5)}
                    </div>
                    {ev.location && <div style={{fontSize:11,color:"#8890aa"}}>📍 {ev.location}</div>}
                    <button className="em-btn em-btn-outline em-btn-sm" style={{marginTop:8,width:"100%"}}>RSVP</button>
                  </div>
                )) : (
                  <div className="em-card-sm" style={{color:"#8890aa",fontSize:13,textAlign:"center",padding:"24px 0"}}>
                    Aucun événement à venir
                  </div>
                )}
                {canAdmin && (
                  <button className="em-btn em-btn-primary" style={{width:"100%",marginTop:8}}>+ Ajouter un événement</button>
                )}
              </div>
            </div>
          </div>

          {/* ── STREAMING ───────────────────────────────────── */}
          <div className={`em-panel${panel==="streaming"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div><div className="em-sect-title">Streaming</div><div className="em-sect-sub">Cultes · Sermons · Diffusion en direct</div></div>
              {canAdmin && (
                <button className="em-btn em-btn-primary em-btn-sm" onClick={() => setShowGS(true)}>⚙ Gérer le stream</button>
              )}
            </div>
            <div style={{background:"#000",borderRadius:14,overflow:"hidden",aspectRatio:"16/9",marginBottom:14}}>
              <iframe
                src="https://www.youtube.com/embed/live_stream?channel=UCxxxxxxxx&autoplay=0&rel=0"
                title="ARC Live"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{width:"100%",height:"100%",border:"none"}}
              />
            </div>
            <div className="em-g3" style={{marginBottom:18}}>
              {[
                {ico:"📅",title:"Culte dominical",desc:"Dimanche à 9h30"},
                {ico:"🎤",title:"Groupe de louange",desc:"Mercredi à 19h00"},
                {ico:"📖",title:"Étude biblique",desc:"Vendredi à 18h30"},
              ].map(s => (
                <div key={s.title} className="em-card-sm" style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <span style={{fontSize:20}}>{s.ico}</span>
                  <div><div style={{fontWeight:600,fontSize:13,color:"#1e2464"}}>{s.title}</div><div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{s.desc}</div></div>
                </div>
              ))}
            </div>
            <a href="/espace-membres/streaming" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"#8899cc",textDecoration:"none"}} target="_blank">
              Voir la page streaming complète →
            </a>
          </div>

          {/* ── PRIÈRE & BIBLE ──────────────────────────────── */}
          <div className={`em-panel${panel==="priere"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div><div className="em-sect-title">Prière & Bible</div><div className="em-sect-sub">Lecture, étude, prières communautaires</div></div>
            </div>
            <div className="em-tabs">
              {([
                ["verset","✦ Verset du jour"],["lecteur","📖 Lecteur biblique"],
                ["etude","🔍 Étude"],["theo","📜 Théologie"],
                ["mur","🙏 Mur de prière"],["plans","📋 Plans de lecture"],
              ] as [BTab,string][]).map(([t,l]) => (
                <button key={t} className={`em-tab${bTab===t?" active":""}`} onClick={() => setBTab(t)}>{l}</button>
              ))}
            </div>

            {/* Verset du jour */}
            {bTab==="verset" && (
              <div>
                <div className="em-card-dark" style={{marginBottom:16}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".09em",color:"rgba(255,255,255,.4)",marginBottom:14}}>✦ Verset du jour — {new Date().toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long"})}</div>
                  <div className="em-verset-card">&ldquo;{VERSET.text}&rdquo;</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:10,fontFamily:"Outfit,sans-serif"}}>— {VERSET.ref}</div>
                  <div style={{display:"flex",gap:8,marginTop:14}}>
                    <button className="em-btn" style={{background:"rgba(255,255,255,.15)",color:"#fff",fontSize:12}} onClick={() => {navigator.clipboard.writeText(VERSET.text);setToast("Verset copié !");}}> Copier</button>
                    <button className="em-btn" style={{background:"rgba(255,255,255,.15)",color:"#fff",fontSize:12}} onClick={() => {setBTab("lecteur");setBBook(42);setBCh(3);}}>📖 Lire le contexte</button>
                  </div>
                </div>
                <div className="em-g2">
                  <div className="em-card">
                    <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:12}}>Plan de lecture du jour</div>
                    {PLAN_LECTURE.map((p,i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                        <div style={{width:18,height:18,border:"2px solid",borderColor:planDone.includes(i)?"#1e2464":"#cbd5e0",borderRadius:4,background:planDone.includes(i)?"#1e2464":"transparent",cursor:"pointer",flexShrink:0}}
                          onClick={()=>setPlanDone(d=>d.includes(i)?d.filter(x=>x!==i):[...d,i])} />
                        <span style={{flex:1,fontSize:13,textDecoration:planDone.includes(i)?"line-through":"none",color:planDone.includes(i)?"#8890aa":"#1a1d3a"}}>{p.ref}</span>
                        {planDone.includes(i) && <span style={{color:"#2f855a",fontSize:12}}>✓</span>}
                      </div>
                    ))}
                    <div style={{marginTop:10,fontSize:11,color:"#8890aa"}}>{planDone.length}/{PLAN_LECTURE.length} passages lus</div>
                  </div>
                  <div className="em-card">
                    <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:12}}>Prières récentes</div>
                    {prayers.slice(0,3).length > 0 ? prayers.slice(0,3).map(p => (
                      <div key={p.id} style={{padding:"7px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#1a1d3a"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#8890aa"}}>{p.prayer_count} prières · {new Date(p.created_at).toLocaleDateString("fr-CH")}</div>
                      </div>
                    )) : (
                      <div style={{color:"#8890aa",fontSize:13,textAlign:"center",padding:"12px 0"}}>Aucune prière pour l&apos;instant</div>
                    )}
                    <button className="em-btn em-btn-outline em-btn-sm" style={{width:"100%",marginTop:10}} onClick={() => setBTab("mur")}>Voir toutes les prières →</button>
                  </div>
                </div>
              </div>
            )}

            {/* Lecteur biblique */}
            {bTab==="lecteur" && (
              <div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                  <select className="em-select" value={bTrans} onChange={e=>setBTrans(e.target.value)}>
                    {TRANS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                  <select className="em-select" value={bBook} onChange={e=>{setBBook(+e.target.value);setBCh(1);}}>
                    <optgroup label="Ancien Testament">
                      {BOOKS.slice(0,39).map((b,i) => <option key={i} value={i}>{b.n}</option>)}
                    </optgroup>
                    <optgroup label="Nouveau Testament">
                      {BOOKS.slice(39).map((b,i) => <option key={i+39} value={i+39}>{b.n}</option>)}
                    </optgroup>
                  </select>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setBCh(c=>Math.max(1,c-1))} disabled={bCh<=1}>‹</button>
                    <select className="em-select" value={bCh} onChange={e=>setBCh(+e.target.value)}>
                      {Array.from({length:BOOKS[bBook].c},(_,i)=>i+1).map(c=>(
                        <option key={c} value={c}>Ch. {c}</option>
                      ))}
                    </select>
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setBCh(c=>Math.min(BOOKS[bBook].c,c+1))} disabled={bCh>=BOOKS[bBook].c}>›</button>
                  </div>
                  <span style={{fontSize:13,color:"#8890aa",alignSelf:"center",fontStyle:"italic"}}>
                    {BOOKS[bBook].n} {bCh}
                  </span>
                </div>
                <div className="em-card" style={{minHeight:300}}>
                  {bLoading ? (
                    <div style={{textAlign:"center",padding:"40px 0"}}>
                      <div style={{width:32,height:32,border:"3px solid #eef1f8",borderTopColor:"#1e2464",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <div style={{marginTop:8,color:"#8890aa",fontSize:13}}>Chargement de {BOOKS[bBook].n} {bCh}…</div>
                    </div>
                  ) : bVerses.length > 0 ? (
                    <div>
                      <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:20,fontWeight:700,color:"#1e2464",marginBottom:16}}>
                        {BOOKS[bBook].n} {bCh}
                      </div>
                      {bVerses.map(v => (
                        <div key={v.verse}
                          className={`em-bible-v${bHl===v.verse?" hl":""}`}
                          onClick={()=>setBHl(bHl===v.verse?null:v.verse)}>
                          <sup>{v.verse}</sup>{v.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{textAlign:"center",padding:"40px 0",color:"#8890aa"}}>
                      <div style={{fontSize:32,marginBottom:8}}>📖</div>
                      <div style={{fontWeight:600}}>Sélectionne un livre et un chapitre</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Étude approfondie */}
            {bTab==="etude" && (
              <div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                  {Object.keys(ETUDE_DB).map(ref => (
                    <button key={ref} className={`em-btn${etudeRef===ref?" em-btn-primary":" em-btn-outline"}`} onClick={()=>setEtudeRef(ref)}>{ref}</button>
                  ))}
                </div>
                {ETUDE_DB[etudeRef] && (
                  <div>
                    <div className="em-card-dark" style={{marginBottom:14}}>
                      <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".09em",color:"rgba(255,255,255,.4)",marginBottom:8}}>Passage étudié</div>
                      <div className="em-verset-card" style={{fontSize:17}}>&ldquo;{VERSET.text}&rdquo;</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:6}}>— {ETUDE_DB[etudeRef].ref}</div>
                    </div>
                    {[
                      {title:"📍 Contexte historique & littéraire",content:ETUDE_DB[etudeRef].contexte},
                      {title:"⛪ Analyse théologique",content:ETUDE_DB[etudeRef].theologie},
                      {title:"✦ Application pratique",content:ETUDE_DB[etudeRef].application},
                    ].map(s => (
                      <div key={s.title} className="em-card" style={{marginBottom:12}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:10}}>{s.title}</div>
                        <p style={{fontSize:13.5,lineHeight:1.7,color:"#4a5070"}}>{s.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bibliothèque théologique */}
            {bTab==="theo" && (
              <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16}}>
                <div>
                  {THEO_CATS.map(cat => (
                    <button key={cat.id} className={`em-ni${theoCat===cat.id?" active":""}`}
                      style={{width:"100%",background:theoCat===cat.id?"#eef1f8":"transparent",color:theoCat===cat.id?"#1e2464":"#4a5070",borderRadius:8,marginBottom:3}}
                      onClick={()=>{setTheoCat(cat.id);setTheoItem(null);}}>
                      <span>{cat.icon}</span><span style={{marginLeft:8,fontSize:13}}>{cat.title}</span>
                    </button>
                  ))}
                </div>
                <div>
                  {theoItem === null
                    ? (
                      <div>
                        {THEO_CATS.find(c=>c.id===theoCat)?.items.map(item => (
                          <div key={item.id} className="em-theo" onClick={()=>setTheoItem(item.id)}>
                            <div style={{fontWeight:600,fontSize:13,color:"#1e2464"}}>{item.title}</div>
                            <div style={{fontSize:12,color:"#8890aa",marginTop:3}}>{item.sub}</div>
                          </div>
                        ))}
                      </div>
                    )
                    : (
                      <div className="em-card">
                        <button className="em-btn em-btn-ghost em-btn-sm" style={{marginBottom:12}} onClick={()=>setTheoItem(null)}>← Retour</button>
                        {(() => {
                          const cat = THEO_CATS.find(c=>c.id===theoCat);
                          const item = cat?.items.find(i=>i.id===theoItem);
                          return item ? (
                            <div>
                              <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464",marginBottom:6}}>{item.title}</div>
                              <div style={{fontSize:12,color:"#8890aa",marginBottom:14}}>{item.sub}</div>
                              <p style={{fontSize:13.5,lineHeight:1.7,color:"#4a5070"}}>
                                Ce document fait partie de la bibliothèque théologique de l&apos;ARC — Ambassade du Royaume du Christ.
                                Contenu en cours de rédaction par l&apos;équipe pastorale.
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )
                  }
                </div>
              </div>
            )}

            {/* Mur de prière */}
            {bTab==="mur" && (
              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{fontSize:13,color:"#8890aa"}}>{prayers.filter(p=>!p.is_answered).length} demande(s) active(s)</div>
                  {canPost && (
                    <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>setShowNewPrayer(true)}>🙏 Partager une prière</button>
                  )}
                </div>
                {pLoading
                  ? <div style={{textAlign:"center",padding:"30px 0",color:"#8890aa"}}>Chargement…</div>
                  : prayers.filter(p=>!p.is_answered).map(p => {
                    const author = p.is_anonymous ? "Anonyme"
                      : [p.profiles?.first_name,p.profiles?.last_name].filter(Boolean).join(" ") || "Membre";
                    const isAuthor = p.user_id === userId;
                    return (
                      <div key={p.id} className="em-prayer">
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
                          <div>
                            <div style={{fontWeight:600,fontSize:13.5,color:"#1a1d3a"}}>{p.title}</div>
                            <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{author} · {new Date(p.created_at).toLocaleDateString("fr-CH")}</div>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>prayFor(p.id)}>
                              🙏 {p.prayer_count > 0 ? p.prayer_count : "Prier"}
                            </button>
                            {isAuthor && (
                              <button className="em-btn em-btn-success em-btn-sm" onClick={()=>markAnswered(p.id)}>✅</button>
                            )}
                          </div>
                        </div>
                        {p.description && <p style={{fontSize:13,color:"#4a5070",lineHeight:1.6}}>{p.description}</p>}
                      </div>
                    );
                  })
                }
                {prayers.filter(p=>p.is_answered).length > 0 && (
                  <div style={{marginTop:18}}>
                    <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",color:"#2f855a",letterSpacing:".08em",marginBottom:10}}>✅ Prières exaucées ({prayers.filter(p=>p.is_answered).length})</div>
                    {prayers.filter(p=>p.is_answered).map(p => (
                      <div key={p.id} style={{background:"#f0fff4",border:"1px solid #9ae6b4",borderRadius:10,padding:"10px 14px",marginBottom:8,opacity:.8}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#276749"}}>{p.title}</div>
                        <div style={{fontSize:11,color:"#68d391"}}>{p.prayer_count} personne(s) ont prié</div>
                      </div>
                    ))}
                  </div>
                )}
                {!canPost && (
                  <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:16,marginTop:10,fontSize:13,color:"#92400e"}}>
                    <strong>Compte en attente</strong> — Tu pourras partager une prière une fois ton compte validé.
                  </div>
                )}
              </div>
            )}

            {/* Plans de lecture */}
            {bTab==="plans" && (
              <div>
                <div className="em-card" style={{marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:12}}>📋 Plan annuel — Bible entière</div>
                  <div style={{fontSize:13,color:"#8890aa",marginBottom:14}}>Avancement : {Math.round(planDone.length/PLAN_LECTURE.length*100)}%</div>
                  <div style={{background:"#f0f2f9",borderRadius:8,height:8,marginBottom:16}}>
                    <div style={{background:"#1e2464",borderRadius:8,height:"100%",width:`${Math.round(planDone.length/PLAN_LECTURE.length*100)}%`,transition:"width .3s"}} />
                  </div>
                  {PLAN_LECTURE.map((p,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                      <div style={{width:20,height:20,border:"2px solid",borderColor:planDone.includes(i)?"#1e2464":"#cbd5e0",borderRadius:4,background:planDone.includes(i)?"#1e2464":"transparent",cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}
                        onClick={()=>setPlanDone(d=>d.includes(i)?d.filter(x=>x!==i):[...d,i])}>
                        {planDone.includes(i) && <span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
                      </div>
                      <span style={{flex:1,fontSize:13,textDecoration:planDone.includes(i)?"line-through":"none",color:planDone.includes(i)?"#8890aa":"#1a1d3a"}}>{p.ref}</span>
                      {planDone.includes(i) && <span className="em-tag-vert em-tag" style={{fontSize:10}}>Lu</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── CONTACTS ────────────────────────────────────── */}
          <div className={`em-panel${panel==="contacts"?" active":""}`}>
            <div className="em-sect-title">Contacts</div>
            <div className="em-sect-sub">{membresCount} membres · Annuaire de l&apos;église</div>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <input className="em-input" placeholder="Rechercher un membre…" value={cSearch} onChange={e=>setCSearch(e.target.value)} style={{maxWidth:360}} />
              <select className="em-select">
                <option value="">Tous les groupes</option>
                {GROUPES.map(g=><option key={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div className="em-g4">
              {ONLINE_MEMBERS.filter(m=>cSearch?m.name.toLowerCase().includes(cSearch.toLowerCase()):true).map(m => (
                <div key={m.name} className="em-card-sm em-card-hover" style={{textAlign:"center",cursor:"pointer"}}>
                  <div className="em-av" style={{width:48,height:48,fontSize:18,background:m.color,margin:"0 auto 10px"}}>{m.name[0]}</div>
                  <div style={{fontWeight:600,fontSize:13,color:"#1e2464"}}>{m.name}</div>
                  <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{m.role}</div>
                  <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:10}}>
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>{setMsgChan(m.name);nav("messagerie");}}>💬</button>
                    <button className="em-btn em-btn-outline em-btn-sm">👤</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── PRÉSENCES ───────────────────────────────────── */}
          <div className={`em-panel${panel==="presences"?" active":""}`}>
            <div className="em-sect-title">Présences</div>
            <div className="em-sect-sub">Suivi des présences aux cultes et événements</div>
            <div className="em-g4" style={{marginBottom:18}}>
              {[{num:"124",lbl:"Dimanche dernier"},{num:"87%",lbl:"Taux de présence"},{num:"18",lbl:"Groupes actifs"},{num:"3",lbl:"Événements ce mois"}].map(s=>(
                <div key={s.lbl} className="em-card-sm" style={{textAlign:"center"}}>
                  <div className="em-stat-num">{s.num}</div><div className="em-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
            <div className="em-card">
              <table className="em-tbl">
                <thead>
                  <tr><th>Date</th><th>Événement</th><th>Présents</th><th>Groupe</th><th>Taux</th></tr>
                </thead>
                <tbody>
                  {[
                    {date:"08.06.2026",title:"Culte dominical",nb:124,group:"Tous",pct:"89%"},
                    {date:"04.06.2026",title:"Étude biblique",nb:34,group:"Membres",pct:"62%"},
                    {date:"01.06.2026",title:"Culte dominical",nb:118,group:"Tous",pct:"84%"},
                    {date:"28.05.2026",title:"Réunion Jeunesse",nb:28,group:"Jeunesse",pct:"88%"},
                  ].map(r => (
                    <tr key={r.date+r.title}>
                      <td style={{color:"#8890aa"}}>{r.date}</td>
                      <td style={{fontWeight:500}}>{r.title}</td>
                      <td><strong>{r.nb}</strong></td>
                      <td><span className="em-tag em-tag-marine">{r.group}</span></td>
                      <td><span className="em-tag em-tag-vert">{r.pct}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── ACTIVITÉS ───────────────────────────────────── */}
          <div className={`em-panel${panel==="activites"?" active":""}`}>
            <div className="em-sect-title">Activités</div>
            <div className="em-sect-sub">Fil d&apos;actualité de la communauté</div>
            <div className="em-card">
              {ACTIVITIES.map((a,i) => (
                <div key={i} className="em-activity">
                  <div className="em-act-ico">{a.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13.5,color:"#1a1d3a"}}>{a.text}</div>
                    <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DONS ────────────────────────────────────────── */}
          <div className={`em-panel${panel==="dons"?" active":""}`}>
            <div className="em-sect-title">Dons & Paiements</div>
            <div className="em-sect-sub">Contribuez à la mission de l&apos;ARC · 4 820 CHF collectés ce mois</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
              <div>
                <div className="em-card" style={{marginBottom:14}}>
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>Faire un don</div>
                  <div style={{marginBottom:10,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"#8890aa"}}>Catégorie</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                    {["Dîme","Offrande","Mission","Construction","Jeunesse"].map(l=>(
                      <button key={l} className={`em-btn em-btn-sm${donLabel===l?" em-btn-primary":" em-btn-outline"}`} onClick={()=>setDonLabel(l)}>{l}</button>
                    ))}
                  </div>
                  <div style={{marginBottom:10,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"#8890aa"}}>Montant (CHF)</div>
                  <div className="em-g4" style={{marginBottom:12}}>
                    {[20,50,100,200].map(a=>(
                      <button key={a} className={`em-amt${donAmt===a?" sel":""}`} onClick={()=>{setDonAmt(a);setDonCustom("");}}>{a}</button>
                    ))}
                  </div>
                  <input className="em-input" type="number" placeholder="Autre montant" value={donCustom}
                    onChange={e=>{setDonCustom(e.target.value);setDonAmt(+e.target.value||0);}} style={{marginBottom:16}} />
                  <div style={{marginBottom:10,fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"#8890aa"}}>Méthode de paiement</div>
                  <div style={{display:"flex",gap:10,marginBottom:18}}>
                    {[["twint","TWINT 📱"],["stripe","Carte 💳"],["postfinance","PostFinance 🏦"],["virement","Virement 🏛"]].map(([v,l])=>(
                      <button key={v} className={`em-btn em-btn-sm${donMethod===v?" em-btn-primary":" em-btn-outline"}`} onClick={()=>setDonMethod(v)}>{l}</button>
                    ))}
                  </div>
                  <button className="em-btn em-btn-primary" style={{width:"100%",justifyContent:"center",padding:"13px"}}
                    onClick={()=>setToast(`Don de ${donAmt} CHF (${donMethod}) — Merci ! 💚`)}>
                    Confirmer le don de {donAmt > 0 ? `${donAmt} CHF` : "…"} — {donLabel}
                  </button>
                </div>
              </div>
              <div>
                <div className="em-card">
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>Dons récents</div>
                  {DONS_RECENTS.map((d,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid rgba(30,36,100,.07)",fontSize:13}}>
                      <div>
                        <div style={{fontWeight:500}}>{d.name}</div>
                        <div style={{fontSize:11,color:"#8890aa"}}>{d.method} · {d.date}</div>
                      </div>
                      <div style={{fontWeight:700,color:"#276749"}}>{d.amount}</div>
                    </div>
                  ))}
                  <div style={{marginTop:14,padding:"12px",background:"#f0fff4",borderRadius:10,textAlign:"center"}}>
                    <div className="em-stat-num" style={{color:"#276749"}}>4 820</div>
                    <div className="em-stat-lbl">CHF collectés ce mois</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ADMINISTRATION ──────────────────────────────── */}
          {canAdmin && (
            <div className={`em-panel${panel==="admin"?" active":""}`}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div><div className="em-sect-title">Administration</div><div className="em-sect-sub">Gestion de l&apos;église</div></div>
                {isAdmin && (
                  <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>setShowGD(true)}>⚙ Gestion des droits</button>
                )}
              </div>
              <div className="em-tabs">
                {([["membres","👥 Membres"],["groupes","🏷 Groupes"],["visiteurs","👁 Visiteurs"],
                   ["crm","📊 CRM"],["support","🛠 Support"],["sermons","📺 Sermons"],["stats","📈 Stats"]] as [ATab,string][]).map(([t,l])=>(
                  <button key={t} className={`em-tab${adminTab===t?" active":""}`} onClick={()=>setAdminTab(t)}>{l}</button>
                ))}
              </div>

              {/* Membres */}
              {adminTab==="membres" && (
                <div className="em-card">
                  <div style={{display:"flex",gap:10,marginBottom:14}}>
                    <input className="em-input" placeholder="Rechercher…" value={mSearch} onChange={e=>setMSearch(e.target.value)} style={{maxWidth:280}} />
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={loadMembers}>↺ Actualiser</button>
                  </div>
                  {mLoading
                    ? <div style={{textAlign:"center",padding:"20px 0",color:"#8890aa"}}>Chargement…</div>
                    : (
                      <table className="em-tbl">
                        <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Groupes</th><th>Statut</th><th>Date</th></tr></thead>
                        <tbody>
                          {members.filter(m=>mSearch
                            ? `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(mSearch.toLowerCase())
                            : true
                          ).map(m=>(
                            <tr key={m.id}>
                              <td style={{fontWeight:500}}>{[m.first_name,m.last_name].filter(Boolean).join(" ")||"—"}</td>
                              <td style={{color:"#8890aa",fontSize:12}}>{m.email}</td>
                              <td><span className="em-tag em-tag-marine">{m.role}</span></td>
                              <td style={{fontSize:11}}>{(m.groups??[]).slice(0,2).join(", ")||"—"}</td>
                              <td>
                                {m.validated
                                  ? <span className="em-tag em-tag-vert">Actif</span>
                                  : <span className="em-tag em-tag-orange">En attente</span>}
                              </td>
                              <td style={{color:"#8890aa",fontSize:11}}>{m.created_at?new Date(m.created_at).toLocaleDateString("fr-CH"):"—"}</td>
                            </tr>
                          ))}
                          {members.length===0 && !mLoading && (
                            <tr><td colSpan={6} style={{textAlign:"center",padding:"20px",color:"#8890aa"}}>
                              Clique sur Actualiser pour charger les membres
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    )
                  }
                </div>
              )}

              {/* Groupes */}
              {adminTab==="groupes" && (
                <div className="em-g3">
                  {GROUPES.map(g=>(
                    <div key={g.name} className="em-card-sm em-card-hover" style={{cursor:"pointer"}}>
                      <div style={{fontSize:24,marginBottom:8}}>{g.icon}</div>
                      <div style={{fontWeight:600,fontSize:13,color:"#1e2464"}}>{g.name}</div>
                      <div style={{fontSize:11,color:"#8890aa",marginTop:3}}>{g.count} membres</div>
                      <button className="em-btn em-btn-outline em-btn-sm" style={{marginTop:10,width:"100%"}}>Gérer</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Visiteurs */}
              {adminTab==="visiteurs" && (
                <div className="em-card">
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>Visiteurs récents</div>
                  <table className="em-tbl">
                    <thead><tr><th>Nom</th><th>Email</th><th>Inscrit le</th><th>Action</th></tr></thead>
                    <tbody>
                      {members.filter(m=>m.role==="visiteur"||!m.validated).slice(0,10).map(m=>(
                        <tr key={m.id}>
                          <td>{[m.first_name,m.last_name].filter(Boolean).join(" ")||"—"}</td>
                          <td style={{color:"#8890aa",fontSize:12}}>{m.email}</td>
                          <td style={{color:"#8890aa",fontSize:11}}>{m.created_at?new Date(m.created_at).toLocaleDateString("fr-CH"):"—"}</td>
                          <td>
                            <button className="em-btn em-btn-success em-btn-sm" onClick={async()=>{
                              await supabase.from("profiles").update({validated:true,role:"membre"}).eq("id",m.id);
                              await loadMembers();
                              setToast("Compte validé ✅");
                            }}>Valider</button>
                          </td>
                        </tr>
                      ))}
                      {members.filter(m=>!m.validated).length===0 && (
                        <tr><td colSpan={4} style={{textAlign:"center",padding:"20px",color:"#8890aa"}}>Aucun visiteur en attente</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* CRM */}
              {adminTab==="crm" && (
                <div>
                  <div className="em-kanban">
                    {CRM_COLS.map(col=>(
                      <div key={col.title} className="em-k-col">
                        <div className="em-k-title" style={{color:col.color}}>{col.title}</div>
                        {col.cards.map(c=>(
                          <div key={c.name} className="em-k-card">
                            <div style={{fontWeight:600,color:"#1e2464"}}>{c.name}</div>
                            <div style={{fontSize:11,color:"#8890aa",marginTop:3}}>{c.note}</div>
                          </div>
                        ))}
                        <button className="em-btn em-btn-ghost em-btn-sm" style={{width:"100%",marginTop:6}}>+ Ajouter</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Support */}
              {adminTab==="support" && isAdmin && (
                <div className="em-card">
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>🛠 Support Technique</div>
                  <div className="em-g2">
                    <div style={{padding:16,background:"#f7f8fc",borderRadius:12,textAlign:"center"}}>
                      <div style={{fontSize:32,marginBottom:8}}>💻</div>
                      <div style={{fontWeight:700,color:"#1e2464",marginBottom:6}}>RustDesk — Accès distant</div>
                      <div style={{fontSize:12,color:"#8890aa",marginBottom:12}}>Contrôle à distance sécurisé</div>
                      <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{
                        if(confirm("⚠️ Vous êtes sur le point d'activer l'accès distant RustDesk. Confirmez-vous ?")) {
                          setToast("RustDesk activé — en attente de connexion");
                        }
                      }}>Activer RustDesk</button>
                    </div>
                    <div style={{padding:16,background:"#f7f8fc",borderRadius:12}}>
                      <div style={{fontWeight:700,color:"#1e2464",marginBottom:10}}>Tickets récents</div>
                      {[{title:"Problème connexion WiFi",status:"Résolu"},{title:"Mise à jour serveur",status:"En cours"},{title:"Backup base de données",status:"Planifié"}].map(t=>(
                        <div key={t.title} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)",fontSize:13}}>
                          <span>{t.title}</span>
                          <span className={`em-tag ${t.status==="Résolu"?"em-tag-vert":t.status==="En cours"?"em-tag-orange":"em-tag-marine"}`}>{t.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {adminTab==="support" && !isAdmin && (
                <div className="em-card" style={{textAlign:"center",padding:"40px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>🔒</div>
                  <div style={{fontWeight:600,color:"#1e2464"}}>Accès réservé à l&apos;Administrateur</div>
                </div>
              )}

              {/* Sermons */}
              {adminTab==="sermons" && (
                <div className="em-card">
                  <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>📺 Gestion des sermons</div>
                  <a href="/admin/sermons" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"#8899cc",textDecoration:"none"}}>
                    Accéder au panneau de gestion des sermons →
                  </a>
                </div>
              )}

              {/* Stats */}
              {adminTab==="stats" && (
                <div>
                  <div className="em-g4" style={{marginBottom:18}}>
                    {[
                      {num:membresCount,lbl:"Membres actifs"},
                      {num:"87%",lbl:"Taux présence"},
                      {num:"4 820 CHF",lbl:"Dons ce mois"},
                      {num:247,lbl:"Vues streaming"},
                    ].map(s=>(
                      <div key={s.lbl} className="em-card-sm" style={{textAlign:"center"}}>
                        <div className="em-stat-num">{s.num}</div><div className="em-stat-lbl">{s.lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div className="em-card">
                    <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>Évolution des membres</div>
                    <div style={{height:120,background:"#f0f2f9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#8890aa",fontSize:13}}>
                      Graphique d&apos;évolution — Bientôt disponible
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* ╔══════ RIGHT PANEL ══════╗ */}
        <aside className="em-rp">
          {/* Online */}
          <div className="em-rp-sec">
            <div className="em-rp-title">En ligne</div>
            {ONLINE_MEMBERS.map(m=>(
              <div key={m.name} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0"}}>
                <div className="em-av" style={{width:26,height:26,fontSize:10,background:m.color}}>{m.name[0]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                  <div style={{fontSize:10,color:"#8890aa"}}>{m.role}</div>
                </div>
                <span className="em-dot-green" />
              </div>
            ))}
          </div>

          {/* Prochain culte */}
          <div className="em-rp-sec">
            <div className="em-rp-title">Prochain culte</div>
            <div style={{fontSize:12,color:"#4a5070",marginBottom:6}}>Dimanche {new Date(new Date().getTime()+((7-new Date().getDay())%7||7)*86400000).toLocaleDateString("fr-CH",{day:"numeric",month:"short"})} · 9h30</div>
            <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:18,fontWeight:700,color:"#1e2464",lineHeight:1.2}}>{countdown}</div>
            <div style={{fontSize:11,color:"#8890aa",marginTop:4}}>📍 La Chaux-de-Fonds</div>
          </div>

          {/* Quick actions */}
          <div className="em-rp-sec">
            <div className="em-rp-title">Accès rapide</div>
            <button className="em-qa" onClick={()=>nav("priere")}>
              <span className="em-qa-ico">🙏</span> Mur de prière
            </button>
            <button className="em-qa" onClick={()=>{nav("messagerie");}}>
              <span className="em-qa-ico">✉</span> Nouveau message
            </button>
            <button className="em-qa" onClick={()=>nav("streaming")}>
              <span className="em-qa-ico">▶</span> Streaming en direct
            </button>
            <button className="em-qa" onClick={()=>nav("dons")}>
              <span className="em-qa-ico">♡</span> Faire un don
            </button>
            <button className="em-qa" onClick={()=>nav("agenda")}>
              <span className="em-qa-ico">📅</span> Voir l&apos;agenda
            </button>
            {canAdmin && (
              <button className="em-qa" onClick={()=>setShowGS(true)}>
                <span className="em-qa-ico">📡</span> Gérer le stream
              </button>
            )}
          </div>

          {/* Activités récentes */}
          <div className="em-rp-sec">
            <div className="em-rp-title">Activités récentes</div>
            {ACTIVITIES.slice(0,4).map((a,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(30,36,100,.06)"}}>
                <span style={{fontSize:14}}>{a.icon}</span>
                <div>
                  <div style={{fontSize:11.5,color:"#4a5070",lineHeight:1.4}}>{a.text}</div>
                  <div style={{fontSize:10,color:"#8890aa",marginTop:1}}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ╔══════ MODALS ══════╗ */}

      {/* Search */}
      {showSearch && (
        <div className="em-overlay" onClick={()=>setShowSearch(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:500}}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">Recherche</span>
              <button className="em-modal-close" onClick={()=>setShowSearch(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <input className="em-input" placeholder="Membres, prières, événements…" value={searchQ} onChange={e=>setSearchQ(e.target.value)} autoFocus />
              <div style={{marginTop:16,fontSize:13,color:"#8890aa",textAlign:"center"}}>
                Tape au moins 2 caractères pour rechercher
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nouvelle prière */}
      {showNewPrayer && (
        <div className="em-overlay" onClick={()=>setShowNewPrayer(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:480}}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">🙏 Partager une prière</span>
              <button className="em-modal-close" onClick={()=>setShowNewPrayer(false)}>✕</button>
            </div>
            <div className="em-modal-body" style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"#8899cc",display:"block",marginBottom:4}}>Titre *</label>
                <input className="em-input" placeholder="Prière pour…" value={pTitle} onChange={e=>setPTitle(e.target.value)} />
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",color:"#8899cc",display:"block",marginBottom:4}}>Détails (optionnel)</label>
                <textarea className="em-textarea" rows={4} placeholder="Décris ta situation…" value={pDesc} onChange={e=>setPDesc(e.target.value)} />
              </div>
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                <input type="checkbox" checked={pAnon} onChange={e=>setPAnon(e.target.checked)} />
                Rester anonyme
              </label>
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button className="em-btn em-btn-primary" style={{flex:1,justifyContent:"center"}} disabled={pSubmitting||!pTitle.trim()} onClick={submitPrayer}>
                  {pSubmitting ? "Envoi…" : "🙏 Soumettre"}
                </button>
                <button className="em-btn em-btn-outline" onClick={()=>setShowNewPrayer(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gestion Stream (admin) */}
      {showGS && canAdmin && (
        <div className="em-overlay" onClick={()=>setShowGS(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">📡 Gestion du Stream</span>
              <button className="em-modal-close" onClick={()=>setShowGS(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div className="em-g2">
                <div style={{background:"#f7f8fc",borderRadius:12,padding:16}}>
                  <div style={{fontWeight:700,color:"#1e2464",marginBottom:8}}>🎥 Zoom Meeting</div>
                  <input className="em-input" placeholder="Meeting ID" style={{marginBottom:8}} />
                  <input className="em-input" placeholder="Passcode" style={{marginBottom:8}} />
                  <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>setToast("Zoom configuré ✓")}>Configurer Zoom</button>
                </div>
                <div style={{background:"#f7f8fc",borderRadius:12,padding:16}}>
                  <div style={{fontWeight:700,color:"#e53e3e",marginBottom:8}}>▶ YouTube Live</div>
                  <input className="em-input" placeholder="Stream Key YouTube" style={{marginBottom:8}} />
                  <input className="em-input" placeholder="ID de la vidéo live" style={{marginBottom:8}} />
                  <button className="em-btn em-btn-danger" style={{width:"100%"}} onClick={()=>setToast("YouTube configuré ✓")}>Configurer YouTube</button>
                </div>
              </div>
              <div style={{marginTop:16,padding:14,background:"#fff0f0",borderRadius:12}}>
                <div style={{fontWeight:700,color:"#e53e3e",marginBottom:6}}>🔴 Démarrer le Live</div>
                <div style={{fontSize:12,color:"#8890aa",marginBottom:10}}>Cette action démarre la diffusion Zoom + YouTube simultanément.</div>
                <button className="em-btn em-btn-danger" style={{width:"100%"}} onClick={()=>{setToast("🔴 Stream démarré !");setShowGS(false);}}>
                  🔴 Démarrer le streaming
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gestion des droits (admin uniquement) */}
      {showGD && isAdmin && (
        <div className="em-overlay" onClick={()=>setShowGD(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">⚙ Gestion des Droits</span>
              <button className="em-modal-close" onClick={()=>setShowGD(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{fontSize:13,color:"#4a5070",marginBottom:16}}>
                Matrice des droits par groupe. Seul l&apos;Administrateur (Jaise) peut modifier ces paramètres.
              </div>
              <table className="em-tbl">
                <thead>
                  <tr><th>Fonctionnalité</th><th>Admin</th><th>Pasteur</th><th>Membre</th><th>Visiteur</th></tr>
                </thead>
                <tbody>
                  {[
                    ["Messagerie","✓","✓","✓","✗"],
                    ["Prière","✓","✓","✓","✗"],
                    ["Streaming","✓","✓","✓","✓"],
                    ["Gestion membres","✓","✓","✗","✗"],
                    ["Gestion droits","✓","✗","✗","✗"],
                    ["Support technique","✓","✗","✗","✗"],
                    ["Dons","✓","✓","✓","✗"],
                  ].map(row=>(
                    <tr key={row[0]}>
                      {row.map((cell,i)=>(
                        <td key={i} style={{color:cell==="✓"?"#276749":cell==="✗"?"#e53e3e":"inherit",fontWeight:i>0?"700":"400"}}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{marginTop:14,padding:12,background:"#fffbeb",borderRadius:10,fontSize:12,color:"#92400e"}}>
                ⚠️ La modification des droits est irréversible et affecte immédiatement tous les utilisateurs concernés.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="em-toast">{toast}</div>}
    </div>
  );
}
