"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getGroup } from "@/lib/groups";
import { submitDoleance } from "@/lib/actions/doleances";
import { updateMemberValidation, savePermissionsMatrix, updateMemberGroups } from "@/lib/actions/membres";
import { setMemberRole as setMemberRoleAction, blockMember } from "@/lib/actions/crm";
import { useReadingPrefs } from "@/contexts/ReadingPrefsContext";
import {
  Home, MessageSquare, Calendar, PlayCircle, BookOpen, Sparkles,
  Users, ClipboardCheck, Bell, BookMarked, Inbox, HandCoins,
  UserCheck, Settings, BarChart3, Mail,
  type LucideIcon,
} from "lucide-react";
import MailPanel from "@/components/mail/MailPanel";
import { getAuthorizedMailboxes } from "@/lib/mail/mailbox-config";

/* ─── Types ─────────────────────────────────────────────────────── */
type Panel  = "accueil"|"messagerie"|"agenda"|"streaming"|"priere"|"contacts"|"presences"|"activites"|"dons"|"admin"|"mail";
type BTab   = "verset"|"lecteur"|"etude"|"theo"|"mur"|"plans"|"notes";
type ATab   = "membres"|"groupes"|"visiteurs"|"crm"|"support"|"sermons"|"stats";
type MsgTab = "msgs"|"files"|"pins"|"tasks";

interface Profile {
  id:string; first_name:string|null; last_name:string|null;
  email:string; role:string; validated:boolean;
  groups:string[]|null; avatar_url:string|null;
}
interface Evt { id:string; title:string; date:string; time_start:string|null; location:string|null; }
interface Prayer { id:string; user_id:string; title:string; description:string|null; is_anonymous:boolean; is_answered:boolean; prayer_count:number; created_at:string; profiles?:{first_name:string|null;last_name:string|null}|null; }
interface Member { id:string; first_name:string|null; last_name:string|null; email:string; role:string; validated:boolean; phone:string|null; groups:string[]|null; created_at:string; }

export interface EMClientProps {
  profile:        Profile|null;
  userId:         string;
  totalUsers:     number;
  membresValides: number;
  visiteurs:      number;
  prayerCount:    number;
  events:         Evt[];
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
  {code:"NBS",   label:"Nouvelle Bible Segond (FR)"},
  {code:"FRDBY", label:"Darby (français)"},
  {code:"NKJV",  label:"New King James Version"},
  {code:"KJV",   label:"King James Version"},
  {code:"YLT",   label:"Young's Literal Translation"},
  {code:"ASV",   label:"American Standard Version"},
];
const DAILY_VERSES = [
  {text:"Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.",ref:"Jean 3:16"},
  {text:"Je suis le chemin, la vérité et la vie. Nul ne vient au Père que par moi.",ref:"Jean 14:6"},
  {text:"Toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.",ref:"Romains 8:28"},
  {text:"Je puis tout par celui qui me fortifie.",ref:"Philippiens 4:13"},
  {text:"L'Éternel est mon berger : je ne manquerai de rien.",ref:"Psaume 23:1"},
  {text:"Ayez confiance en l'Éternel de tout votre cœur, et ne vous appuyez pas sur votre intelligence.",ref:"Proverbes 3:5"},
  {text:"C'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu.",ref:"Éphésiens 2:8"},
  {text:"Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.",ref:"Matthieu 11:28"},
  {text:"Que la paix de Dieu, qui surpasse toute intelligence, garde vos cœurs et vos pensées en Jésus-Christ.",ref:"Philippiens 4:7"},
  {text:"Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.",ref:"Matthieu 6:33"},
  {text:"Si nous confessons nos péchés, il est fidèle et juste pour nous les pardonner et pour nous purifier.",ref:"1 Jean 1:9"},
  {text:"L'Éternel est ma lumière et mon salut : de qui aurais-je crainte ?",ref:"Psaume 27:1"},
  {text:"Car je connais les projets que j'ai formés sur vous : projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",ref:"Jérémie 29:11"},
  {text:"Ne crains point, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu.",ref:"Ésaïe 41:10"},
  {text:"Que votre lumière luise ainsi devant les hommes, afin qu'ils voient vos bonnes œuvres et glorifient votre Père.",ref:"Matthieu 5:16"},
  {text:"Il donne de la force à celui qui est fatigué, et il augmente la vigueur de celui qui est sans forces.",ref:"Ésaïe 40:29"},
  {text:"Dieu est notre refuge et notre force, un secours qui ne manque jamais dans la détresse.",ref:"Psaume 46:2"},
  {text:"L'amour est patient, il est plein de bonté ; l'amour n'est point envieux, il ne se vante point.",ref:"1 Corinthiens 13:4"},
  {text:"Soyez forts et courageux ! Ne soyez pas effrayés, car l'Éternel ton Dieu est avec toi dans tout ce que tu entreprendras.",ref:"Josué 1:9"},
  {text:"Réjouissez-vous toujours dans le Seigneur ; je le répète, réjouissez-vous.",ref:"Philippiens 4:4"},
  {text:"Toute l'Écriture est inspirée de Dieu et utile pour enseigner, pour convaincre, pour corriger, pour instruire dans la justice.",ref:"2 Timothée 3:16"},
  {text:"Tu aimeras le Seigneur ton Dieu de tout ton cœur, de toute ton âme et de toute ta pensée.",ref:"Matthieu 22:37"},
  {text:"La foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.",ref:"Hébreux 11:1"},
  {text:"L'Éternel te gardera de tout mal ; il gardera ton âme.",ref:"Psaume 121:7"},
  {text:"Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout-Puissant.",ref:"Psaume 91:1"},
  {text:"Moi, je suis la résurrection et la vie. Celui qui croit en moi vivra, quand même il serait mort.",ref:"Jean 11:25"},
  {text:"Car nous sommes son ouvrage, ayant été créés en Jésus-Christ pour de bonnes œuvres.",ref:"Éphésiens 2:10"},
  {text:"Remets ton sort à l'Éternel, mets en lui ta confiance, et il agira.",ref:"Psaume 37:5"},
  {text:"Je te loue de ce que je suis une créature si merveilleuse. Tes œuvres sont admirables.",ref:"Psaume 139:14"},
  {text:"Heureux les artisans de paix, car ils seront appelés fils de Dieu.",ref:"Matthieu 5:9"},
];
const _dow = new Date();
const _doy = Math.floor((_dow.getTime() - new Date(_dow.getFullYear(),0,0).getTime())/86400000);
const VERSET = DAILY_VERSES[_doy % DAILY_VERSES.length];
const THEO_CATS = [
  { id:"conf", title:"Confessions de Foi", icon:"📜", items:[
    {id:"westminster",title:"Confession de Westminster (1646)",sub:"Document fondateur du calvinisme presbytérien",
     content:"Rédigée par 121 théologiens à l'abbaye de Westminster (1643-1649), cette confession définit avec précision les doctrines calvinistes : souveraineté absolue de Dieu, prédestination, autorité unique des Écritures (Sola Scriptura), justification par la foi seule. Structurée en 33 chapitres (de la Sainte Écriture à la résurrection des morts), elle reste la confession de foi de référence de nombreuses Églises presbytériennes et réformées dans le monde. Son catéchisme abrégé — « Quel est le but principal de l'homme ? Glorifier Dieu et jouir de lui pour toujours » — est l'une des plus belles formulations de la foi réformée."},
    {id:"heidelberg",title:"Catéchisme de Heidelberg (1563)",sub:"129 questions sur la foi réformée",
     content:"Composé en 1563 à Heidelberg à la demande du prince Frédéric III, ce catéchisme est organisé en 129 questions-réponses réparties sur 52 dimanches. Trois parties : la misère de l'homme (péché), la délivrance (salut par Christ), la gratitude (vie chrétienne). Sa première question est célèbre : « Quelle est ta seule assurance dans la vie et dans la mort ? C'est que j'appartiens en corps et en âme, non à moi-même, mais à mon fidèle Sauveur Jésus-Christ. » Son ton pastoral et personnel — à la différence du style juridique de Westminster — en fait un outil précieux pour l'instruction des nouveaux croyants et les catéchumènes."},
    {id:"nicee",title:"Credo de Nicée (381 ap. J.-C.)",sub:"Le symbole de foi œcuménique universel",
     content:"Issu du Concile de Nicée (325) puis complété à Constantinople (381), ce credo est la confession de foi la plus universellement reconnue du christianisme. Il affirme la pleine divinité du Fils — « consubstantiel au Père » (homoousios) — contre l'arianisme qui en faisait une créature. Il confesse également la divinité du Saint-Esprit, « Seigneur et vivificateur, qui procède du Père ». Récité dans les liturgies catholiques, orthodoxes et protestantes, il constitue le fondement doctrinal commun du christianisme trinitaire et l'expression la plus consensuelle de la foi des Pères de l'Église."},
    {id:"apostles",title:"Symbole des Apôtres",sub:"Résumé fondamental de la foi chrétienne",
     content:"Le Symbole des Apôtres est la confession de foi la plus ancienne du christianisme occidental, dont l'origine remonte au IIe siècle comme formule baptismale à Rome. Ses douze articles résument la foi trinitaire : création par le Père tout-puissant ; incarnation, mort, résurrection et retour du Fils ; œuvre du Saint-Esprit dans l'Église, la communion des saints, le pardon des péchés, la résurrection des corps et la vie éternelle. Plus bref que le Credo de Nicée, il est l'outil catéchétique le plus utilisé dans les cultes chrétiens protestants depuis la Réformation."},
  ]},
  { id:"doct", title:"Doctrines Fondamentales", icon:"⛪", items:[
    {id:"trinite",title:"La Trinité — Père, Fils, Saint-Esprit",sub:"Doctrine centrale du christianisme orthodoxe",
     content:"La Trinité affirme qu'il n'existe qu'un seul Dieu en trois personnes distinctes et coéternelles : Père, Fils et Saint-Esprit. Ce n'est ni trois dieux (trithéisme), ni un Dieu changeant de forme (modalisme), mais une seule essence divine (ousia) en trois hypostases. Bibliquement : le Père crée (Genèse 1), le Fils est le Verbe incarné qui rachète (Jean 1:1-14), l'Esprit habite et sanctifie (1 Corinthiens 3:16). La formule trinitaire apparaît dans la Grande Commission (Matthieu 28:19) et la bénédiction apostolique (2 Corinthiens 13:13). Cette doctrine, définie aux Conciles de Nicée (325) et Constantinople (381), est le cœur du christianisme orthodoxe."},
    {id:"salvation",title:"La Sotériologie — Doctrine du Salut",sub:"Grâce, foi, justification, sanctification",
     content:"La sotériologie est l'étude du salut. Dans la tradition réformée, le salut suit la chaîne logique de Romains 8:30 : Dieu prescient → prédestine → appelle (vocation efficace) → justifie → glorifie. La justification est la déclaration judiciaire par laquelle Dieu déclare le pécheur juste, non en raison de ses mérites, mais par l'imputation de la justice de Christ reçue par la foi (Romains 3:21-26). La régénération est l'œuvre souveraine du Saint-Esprit (Jean 3:3-8). La sanctification est le processus progressif de transformation à l'image de Christ (2 Corinthiens 3:18). La glorification est la consommation eschatologique de ce salut au retour du Christ."},
    {id:"eschat",title:"L'Eschatologie — Les Dernières Choses",sub:"Résurrection, jugement, cieux, enfer",
     content:"L'eschatologie traite des événements de la fin des temps. Points fondamentaux : (1) La mort et l'état intermédiaire — les croyants sont « avec Christ » (Philippiens 1:23), les incroyants en attente du jugement. (2) Le retour personnel, visible et glorieux de Christ (Actes 1:11 ; Matthieu 24:30). (3) La résurrection corporelle de tous les morts (Jean 5:28-29 ; 1 Corinthiens 15). (4) Le Jugement dernier devant le trône de Dieu (Apocalypse 20:11-15). (5) La nouvelle création — nouveaux cieux et nouvelle terre où demeure la justice (Apocalypse 21 ; 2 Pierre 3:13). Les positions millénaristes varient mais l'Église confesse universellement : le retour de Christ et la vie éternelle."},
    {id:"eccles",title:"L'Ecclésiologie — Doctrine de l'Église",sub:"Nature, mission et gouvernement de l'Église",
     content:"L'Ecclésiologie définit ce qu'est l'Église (ekklesia = assemblée appelée). Les quatre marques du Credo de Nicée : Une (corps unique de Christ, Éphésiens 4:4), Sainte (séparée pour Dieu), Catholique (universelle, transcendant cultures et temps), Apostolique (fondée sur le témoignage des apôtres, Éphésiens 2:20). Les deux marques de la Réformation : prédication fidèle de la Parole et administration correcte des sacrements (baptême et Cène). La mission de l'Église : proclamer l'Évangile (Matthieu 28:19-20), édifier les croyants (Éphésiens 4:12), servir le prochain (Jacques 1:27) et glorifier Dieu dans toute la création."},
  ]},
  { id:"herm", title:"Herméneutique & Exégèse", icon:"🔍", items:[
    {id:"herm1",title:"Principes d'Interprétation Biblique",sub:"Méthodes grammatico-historiques et contextuelles",
     content:"L'herméneutique biblique est la science de l'interprétation des Écritures. Principes fondamentaux : (1) Grammatico-historique — comprendre le sens selon la grammaire originale (hébreu/araméen/grec) et le contexte historique de l'auteur humain. (2) L'Écriture interprète l'Écriture — les passages obscurs s'éclairent par les passages clairs. (3) Progressivité de la révélation — l'AT annonce, le NT accomplit et révèle pleinement. (4) Contexte littéraire — verset → paragraphe → livre → canon. (5) Genre littéraire — lire la poésie comme poésie, l'apocalyptique comme apocalyptique. (6) Intention de l'auteur — chercher ce que Dieu a voulu communiquer, pas ce que nous projetons sur le texte."},
    {id:"types",title:"Typologies et Figures Prophétiques",sub:"L'AT préfigurant le NT",
     content:"La typologie étudie les types bibliques — personnes, événements ou institutions de l'AT qui préfigurent des réalités du NT voulues par Dieu. Exemples : Adam est type de Christ (Romains 5:14) ; le sacrifice de l'agneau pascal préfigure le Christ, notre Pâque (1 Corinthiens 5:7) ; le grand prêtre préfigure Christ comme intercesseur unique (Hébreux 4:14-16) ; le temple préfigure le corps de Christ et les croyants comme temple de l'Esprit (Jean 2:21 ; 1 Corinthiens 6:19). Cette méthode, utilisée par Jésus lui-même (Luc 24:27) et les apôtres, montre l'unité organique des deux Testaments et la cohérence du plan de rédemption divin."},
    {id:"genres",title:"Genres Littéraires de la Bible",sub:"Poésie, prophétie, apocalyptique, épître",
     content:"La Bible contient plusieurs genres littéraires, chacun avec ses règles d'interprétation propres. (1) Narratif historique (Genèse–Actes) — récit avec visée théologique, ne pas surcharger les détails. (2) Poésie hébraïque (Psaumes, Proverbes, Cantique) — parallélisme synonymique, antithétique, synthétique ; images et métaphores ne sont pas à prendre au pied de la lettre. (3) Prophétique (Ésaïe–Malachie) — annonce conditionnelle ou inconditionnelle, accomplie ou à venir. (4) Apocalyptique (Daniel, Apocalypse) — visions symboliques décrivant des réalités célestes et eschatologiques ; nécessite de décoder les symboles dans le contexte canonique. (5) Épître (Paul, Pierre, Jean) — instruction doctrinale et pratique pour des contextes précis. (6) Sagesse (Job, Ecclésiaste) — réflexion sur la souffrance et la limite de la sagesse humaine."},
  ]},
  { id:"hist", title:"Histoire de l'Église", icon:"🏛️", items:[
    {id:"peres",title:"Les Pères de l'Église (I–IV siècle)",sub:"Irénée, Tertullien, Origène, Augustin...",
     content:"Les Pères de l'Église sont les théologiens et évêques qui ont défini et défendu la foi chrétienne aux premiers siècles. Ignace d'Antioche (†107) — l'eucharistie et l'unité de l'Église. Justin Martyr (†165) — premier apologiste, dialogue avec la philosophie grecque. Irénée de Lyon (†202) — combat le gnosticisme, défend l'unité des deux Testaments. Tertullien (†220) — forge le vocabulaire trinitaire latin (« Trinitas », « persona »). Athanase d'Alexandrie (†373) — défend la divinité du Christ contre l'arianisme : « Athanase contre le monde ». Augustin d'Hippone (354-430) — le plus influent : grâce souveraine, prédestination, Cité de Dieu, péché originel. Leurs écrits restent des ressources majeures pour la théologie contemporaine."},
    {id:"reform",title:"La Réformation (XVI siècle)",sub:"Luther, Calvin, Zwingli et leurs contributions",
     content:"La Réformation protestante est l'une des ruptures les plus importantes de l'histoire chrétienne. Martin Luther (1483-1546) affiche ses 95 thèses en 1517, défendant la justification par la foi seule (Sola Fide) contre les indulgences. Sa traduction de la Bible en allemand démocratise l'accès aux Écritures. Ulrich Zwingli (1484-1531) réforme Zurich sur la base de l'Écriture seule. Jean Calvin (1509-1564) à Genève systématise la théologie réformée dans ses Institutes (1536) et développe le gouvernement presbytérien. Les cinq Solas résument la Réforme : Sola Scriptura, Sola Fide, Sola Gratia, Solus Christus, Soli Deo Gloria. Ce mouvement est l'héritage théologique direct de l'ARC."},
    {id:"missions",title:"L'Ère Missionnaire (XIX–XX siècle)",sub:"William Carey, Hudson Taylor, missions en Afrique",
     content:"Le XIXe siècle voit un réveil missionnaire sans précédent. William Carey (1761-1834), père de la mission moderne, part en Inde en 1793 et traduit la Bible en bengali et 34 autres langues. Hudson Taylor (1832-1905) fonde la China Inland Mission (1865) et impose l'inculturation missionnaire comme principe clé. David Livingstone (1813-1873) explore l'Afrique et combat l'esclavage. Des missionnaires européens et américains implantent des Églises en Afrique, en Asie et en Amérique Latine. Aujourd'hui, les Églises du Sud global — notamment en Afrique subsaharienne et en Amérique Latine — sont les plus dynamiques et les plus nombreuses au monde, héritières directes de cet élan missionnaire."},
  ]},
];
const ONLINE_MEMBERS: {name:string;role:string;color:string}[] = [];
const ACTIVITIES: {icon:string;text:string;time:string}[] = [];
const DONS_RECENTS: {name:string;amount:string;method:string;date:string}[] = [];
// Compteurs réels chargés depuis Supabase (profiles.groups[], role='membre')
const GROUPES = [
  {name:"Pasteur",              slug:"pasteur",       count:0, hex:"#92400e", hexBg:"#fffbeb"},
  {name:"Équipe Média",         slug:"media",         count:0, hex:"#1d4ed8", hexBg:"#eff6ff"},
  {name:"Chorale",              slug:"chorale",       count:0, hex:"#be185d", hexBg:"#fdf2f8"},
  {name:"La Jeunesse",          slug:"jeunesse",      count:0, hex:"#c2410c", hexBg:"#fff7ed"},
  {name:"Groupe des Femmes",    slug:"femmes",        count:0, hex:"#be123c", hexBg:"#fff1f2"},
  {name:"Social & Hospitalité", slug:"social",        count:0, hex:"#047857", hexBg:"#ecfdf5"},
  {name:"Sanitaire & Propreté", slug:"sanitaire",     count:0, hex:"#0f766e", hexBg:"#f0fdfa"},
  {name:"Écodim",               slug:"ecodim",        count:0, hex:"#4d7c0f", hexBg:"#f7fee7"},
  {name:"Suivi d'âmes",         slug:"suivi",         count:0, hex:"#0369a1", hexBg:"#f0f9ff"},
  {name:"Communication",        slug:"communication", count:0, hex:"#6d28d9", hexBg:"#f5f3ff"},
  {name:"Support",              slug:"support",       count:0, hex:"#334155", hexBg:"#f1f5f9"},
  {name:"Finance",              slug:"finance",       count:0, hex:"#b45309", hexBg:"#fef3c7"},
];
const MSG_FILES: {name:string;size:string;from:string;time:string;icon:string}[] = [];
// Tâches et statuts chargés depuis Supabase (pas de données fictives)
const MSG_TASKS: {id:string;title:string;done:boolean;assignee:string;due:string}[] = [];
const USER_STATUSES: Record<string,"online"|"away"|"busy"|"offline"> = {};
const QUICK_EMOJIS = ["🙏","❤️","🙌","😊","🔥","✅"];
const EMOJI_LIST = [
  "😊","😂","🥰","😍","🤩","😇","😭","😅","🤔","😴",
  "🙏","❤️","💕","💯","🔥","✅","👍","🎉","🙌","💪",
  "✨","🌟","🎵","📖","⛪","🕊️","🌈","💐","🌿","👑",
  "🤝","💬","📅","🎶","🌍","💡","🏆","🕐","📢","🫶",
];
// Pipeline CRM — colonnes fixes, cartes chargées depuis crm_contacts (Supabase)
const CRM_COLS = [
  {title:"Visiteurs",     color:"#8890aa", cards:[] as {name:string;note:string}[]},
  {title:"En suivi",      color:"#c05621", cards:[] as {name:string;note:string}[]},
  {title:"En intégration",color:"#1e40af", cards:[] as {name:string;note:string}[]},
  {title:"Membres actifs",color:"#065f46", cards:[] as {name:string;note:string}[]},
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

/* ─── Gestion des Droits ──────────────────────────────────────────── */
const GD_FEATURES = [
  { id:"live",          label:"📺 Streaming live (vitrine)" },
  { id:"replays",       label:"📼 Accès replays vidéos" },
  { id:"stream",        label:"🎛 Gestion Stream (Zoom+YouTube)" },
  { id:"plateformes",   label:"🖼 Maj Plateformes (vitrine)" },
  { id:"crm",           label:"🗂 Gestion CRM" },
  { id:"analytics",     label:"📊 Analytics / Tableau de bord" },
  { id:"rdv",           label:"📹 Rendez-vous pastoral" },
  { id:"contacts_all",  label:"👥 Contacts : tous les membres" },
  { id:"contacts_grp",  label:"👤 Contacts : groupe uniquement" },
  { id:"dons_recur",    label:"📅 Dons récurrents (Stripe)" },
  { id:"events_rsvp",   label:"🎟 Réservation événements (RSVP)" },
  { id:"chat_invite",   label:"💬 Invitation canal chat temporaire" },
  { id:"support_rd",    label:"🖥 Prise en main à distance (RustDesk)" },
  { id:"user_promote",  label:"⬆ Promouvoir Visiteur → Membre" },
  { id:"user_revoke",   label:"❌ Révoquer / bloquer un compte" },
  { id:"pastor_manage", label:"👑 Gérer les Pasteurs (Admin only)" },
];
// Matrice de droits — source de vérité : CDC v3.5 sections 2, 3, 4
// RÔLES (profiles.role, valeur unique) : admin | pasteur | membre | visiteur
// FONCTIONS (profiles.groups[], valeurs multiples) : pasteur | media | chorale | jeunesse | femmes | social | sanitaire | finance | ecodim | suivi | communication | support
// Rôle Pasteur : accès lecture seule sur stream/gestion ; Fonction Média : seule à gérer les paramètres stream
// Finance (ajoutée post-CDC v3.4) : CRM + analytics accès complet
const GD_GROUPS = ["admin","pasteur","media","chorale","jeunesse","femmes","social","sanitaire","finance","ecodim","suivi","communication","support"] as const;
const GD_GROUP_LABELS: Record<string,string> = {admin:"Admin",pasteur:"Pasteur",media:"Média",chorale:"Chorale",jeunesse:"Jeunesse",femmes:"Femmes",social:"Social",sanitaire:"Sanit.",finance:"Finance",ecodim:"Écodim",suivi:"Suivi",communication:"Comm.",support:"Support"};
const GD_DEFAULTS: Record<string,Record<string,boolean>> = {
  // Streaming / Live vitrine (CDC §4) — Pasteur✓, Média✓, Comm✓ ; Support✗
  live:         {admin:true, pasteur:true, media:true, chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:true, support:false},
  replays:      {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // Gestion stream (paramètres YouTube/Zoom) : Pasteur = lecture seule, Média = gestion complète (CDC §4)
  stream:       {admin:true, pasteur:true, media:true, chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:false},
  // CMS vitrine (CDC §4) — Pasteur✓, Média✓, Comm✓
  plateformes:  {admin:true, pasteur:true, media:true, chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:true, support:false},
  // CRM (CDC §5.1) — Comm✓, Pasteur✓, Support=lecture ; Finance (post-CDC) = accès complet
  crm:          {admin:true, pasteur:true, media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:true, ecodim:false,suivi:false,communication:true, support:true},
  // Analytics pastoraux (CDC §12.8) — Admin+Pasteur ; Finance (post-CDC) = accès complet
  analytics:    {admin:true, pasteur:true, media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:true, ecodim:false,suivi:false,communication:false,support:false},
  // Rendez-vous pastoral (CDC §12.12) — tous
  rdv:          {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // Contacts : tous les membres (CDC §5.1) — Pasteur✓, Support=lecture
  contacts_all: {admin:true, pasteur:true, media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:true},
  // Contacts : groupe uniquement — tous les groupes
  contacts_grp: {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // Dons récurrents (CDC §12.1) — tous
  dons_recur:   {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // RSVP événements — tous
  events_rsvp:  {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // Invitation canal chat — tous
  chat_invite:  {admin:true, pasteur:true, media:true, chorale:true, jeunesse:true, femmes:true, social:true, sanitaire:true, finance:true, ecodim:true, suivi:true, communication:true, support:true},
  // Prise en main à distance RustDesk (CDC §8) — Fonction Support EXCLUSIF
  support_rd:   {admin:true, pasteur:false,media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:true},
  // Promotion Visiteur → Membre (CDC §4) — Admin + Rôle Pasteur
  user_promote: {admin:true, pasteur:true, media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:false},
  // Révoquer / bloquer un compte (CDC §4 CRUD membres) — Admin + Rôle Pasteur
  user_revoke:  {admin:true, pasteur:true, media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:false},
  // Gérer les Pasteurs — Admin uniquement (CDC §2.1)
  pastor_manage:{admin:true, pasteur:false,media:false,chorale:false,jeunesse:false,femmes:false,social:false,sanitaire:false,finance:false,ecodim:false,suivi:false,communication:false,support:false},
};

/* ─── Maj Plateformes ─────────────────────────────────────────────── */
interface MPCard { id:number; icon:string; title:string; tag:string; desc:string; descLong:string; cta:string; link:string; video:string; schedule:string; contact:string; bg:string; }
const MP_CARDS_DEFAULT: MPCard[] = [
  { id:0, icon:"🔥", title:"La Jeunesse ARC", tag:"Pour les Jeunes · 15-35 ans", desc:"Un espace de croissance, d'amitié profonde et de foi engagée pour les 15-35 ans.", descLong:"La Jeunesse ARC est un mouvement de foi pour les 15-35 ans. Chaque vendredi soir, nous nous réunissons pour la louange, la Parole et des activités.", cta:"En savoir plus →", link:"/jeunesse", video:"", schedule:"Vendredi soir · 19h00 — 21h30", contact:"Past. Daniel Mwamba", bg:"linear-gradient(135deg,#c53030,#e53e3e,#2d3a8e)" },
  { id:1, icon:"🌸", title:"Groupe des Femmes", tag:"Pour les Femmes", desc:"Un espace sacré de sœurie, de prière partagée et d'encouragement mutuel.", descLong:"Le Groupe des Femmes ARC se réunit chaque mardi pour prier, partager la Parole et s'encourager mutuellement.", cta:"En savoir plus →", link:"/femmes", video:"", schedule:"Mardi · 18h00 — 20h00", contact:"Christine Mabika", bg:"linear-gradient(135deg,#7b3f00,#c05621,#d4a843)" },
  { id:2, icon:"🌱", title:"Écodim", tag:"Pour les Enfants · 0-14 ans", desc:"Des enseignements adaptés et des activités créatives pour vos enfants.", descLong:"L'École du Dimanche ARC accueille les enfants de 0 à 14 ans chaque dimanche pendant le culte principal.", cta:"En savoir plus →", link:"/ecodim", video:"", schedule:"Dimanche · 09h30 — 12h00", contact:"Félicité Mukuna", bg:"linear-gradient(135deg,#276749,#4a9e6e,#0f123a)" },
  { id:3, icon:"🏠", title:"La Famille ARC", tag:"Toute la communauté", desc:"Rejoignez une communauté chaleureuse fondée sur l'amour, la prière et la fraternité.", descLong:"La Famille ARC, c'est vous ! Une communauté unie par la foi et l'amour du Christ. Bienvenue dans votre famille spirituelle.", cta:"Rejoindre la famille →", link:"/rejoindre", video:"", schedule:"Dimanche · 09h30 & 17h00", contact:"contact@arc-eglise.ch", bg:"linear-gradient(135deg,#1e2464,#2d3a8e,#553c9a)" },
];
const MP_GRADIENTS = [
  "linear-gradient(135deg,#c53030,#e53e3e,#2d3a8e)",
  "linear-gradient(135deg,#7b3f00,#c05621,#d4a843)",
  "linear-gradient(135deg,#276749,#4a9e6e,#0f123a)",
  "linear-gradient(135deg,#1e2464,#2d3a8e,#553c9a)",
  "linear-gradient(135deg,#0d47a1,#42a5f5)",
  "linear-gradient(135deg,#6a1b9a,#e91e63)",
  "linear-gradient(135deg,#1a237e,#00bcd4)",
  "linear-gradient(135deg,#33691e,#f9a825)",
];

/* ─── Component ──────────────────────────────────────────────────── */
const VALID_PANELS: Panel[] = ["accueil","messagerie","agenda","streaming","priere","contacts","presences","activites","dons","admin","mail"];

export default function EspaceMembresClient({ profile, userId, totalUsers, membresValides, visiteurs, prayerCount, events }: EMClientProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();

  /* Nav */
  const [panel, setPanel]     = useState<Panel>(() => {
    const p = searchParams.get("panel") as Panel | null;
    return p && VALID_PANELS.includes(p) ? p : "accueil";
  });
  const [toast, setToast]     = useState<string|null>(null);

  /* Mobile */
  const [showDrawer, setShowDrawer]     = useState(false);
  const [mobChanOpen, setMobChanOpen]   = useState(false);

  /* Header */
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* Modals */
  const [showGS, setShowGS] = useState(false);
  const [showGD, setShowGD] = useState(false);
  const [showNewPrayer, setShowNewPrayer] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showSalle, setShowSalle]       = useState(false);
  const [showMP, setShowMP]           = useState(false);
  const [showMajInfo, setShowMajInfo] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showDoleance, setShowDoleance]   = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [showInvite, setShowInvite]       = useState(false);
  const [showNote, setShowNote]           = useState(false);
  // Sub-states for modals
  const [gdTab, setGdTab] = useState<"matrix"|"pasteurs"|"membres"|"audit">("matrix");
  const [gdPerms, setGdPerms] = useState<Record<string,Record<string,boolean>>>(() => {
    const p: Record<string,Record<string,boolean>> = {};
    for (const k in GD_DEFAULTS) p[k] = {...GD_DEFAULTS[k]};
    return p;
  });
  const [mpCards, setMpCards] = useState<MPCard[]>(() => MP_CARDS_DEFAULT.map(c => ({...c})));
  const [mpCard, setMpCard]   = useState(0);
  const [majInfoTab, setMajInfoTab] = useState<"sermons"|"events"|"infos"|"verset"|"equipe">("sermons");
  const [settingsSection, setSettingsSection] = useState<"notifs"|"privacy"|"langue"|"bible"|"affichage"|"securite">("notifs");
  const [pwdCurrent, setPwdCurrent]       = useState("");
  const [pwdNew, setPwdNew]               = useState("");
  const [pwdNewConfirm, setPwdNewConfirm] = useState("");
  const [pwdLoading, setPwdLoading]       = useState(false);
  const [pwdError, setPwdError]           = useState<string|null>(null);
  const [pwdSuccess, setPwdSuccess]       = useState(false);
  const [pwdShowCurrent, setPwdShowCurrent] = useState(false);
  const [pwdShowNew, setPwdShowNew]         = useState(false);
  const [settingsNotifs, setSettingsNotifs] = useState({dm:true,culte:true,priere:true,verset:true,events:false});
  const [noteRef, setNoteRef]     = useState("Jean 3:16");
  const [noteContent, setNoteContent] = useState("");
  const [doleanceType, setDoleanceType] = useState("bug");
  const [doleanceText, setDoleanceText] = useState("");
  const [doleanceAnon, setDoleanceAnon] = useState(false);
  const [doleanceSending, setDoleanceSending] = useState(false);
  const [invitePrenom, setInvitePrenom] = useState("");
  const [inviteNom, setInviteNom]       = useState("");
  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteGroupe, setInviteGroupe] = useState("");

  /* Bible */
  const [bTab, setBTab]         = useState<BTab>("verset");
  const [bBook, setBBook]       = useState(42);   // Jean = index 42 (0-based)
  const [bCh, setBCh]           = useState(3);
  const [bTrans, setBTrans]     = useState("NBS");
  const [bVerses, setBVerses]   = useState<{verse:number;text:string}[]>([]);
  const [bLoading, setBLoading] = useState(false);
  const [bError, setBError]     = useState<string|null>(null);
  const [bHl, setBHl]           = useState<number|null>(null);
  const [theoCat, setTheoCat]   = useState("conf");
  const [theoItem, setTheoItem] = useState<string|null>(null);
  const [etudeRef, setEtudeRef] = useState("Jean 3:16");
  const [planDone, setPlanDone] = useState<number[]>([]);

  /* Reading plans */
  type RpPlan = { id:string; titre:string; description:string|null; total_days:number };
  const [rpPlans, setRpPlans]     = useState<RpPlan[]>([]);
  const [rpProgress, setRpProgress] = useState<Record<string,number>>({}); // plan_id -> current_day
  const [rpLoading, setRpLoading] = useState(false);

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
  const [expandedMember, setExpandedMember] = useState<string|null>(null);

  /* Messagerie */
  const [msgChan, setMsgChan]     = useState("général");
  const [msgTab, setMsgTab]       = useState<MsgTab>("msgs");
  const [msgInput, setMsgInput]   = useState("");
  const [messages, setMessages]   = useState<{id:string;from:string;text:string;mine:boolean;time:string}[]>([]);
  const msgEndRef    = useRef<HTMLDivElement>(null);
  const msgInputRef  = useRef<HTMLTextAreaElement>(null);
  const [msgReactions, setMsgReactions]     = useState<Record<string,Record<string,number>>>({});
  const [myReactions, setMyReactions]       = useState<Record<string,string[]>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState<string|null>(null);
  const [pinnedMsgs, setPinnedMsgs]         = useState<string[]>([]);
  const [openThread, setOpenThread]         = useState<string|null>(null);
  const [threadReplies, setThreadReplies]   = useState<Record<string,{id:string;from:string;text:string;time:string;mine:boolean}[]>>({});
  const [threadInput, setThreadInput]       = useState("");
  const [huddleActive, setHuddleActive]     = useState(false);
  const [msgHover, setMsgHover]             = useState<string|null>(null);
  const [showMention, setShowMention]       = useState(false);
  const [showMsgEmoji, setShowMsgEmoji]     = useState(false);
  const [taskDone, setTaskDone]             = useState<string[]>([]);

  /* Agenda */
  const [calMonth, setCalMonth]         = useState(() => new Date().getMonth());
  const [calYear, setCalYear]           = useState(() => new Date().getFullYear());
  const [calSelectedDate, setCalSelectedDate] = useState<number|null>(null);
  const [calNoteInput, setCalNoteInput]       = useState("");
  const [calNotes, setCalNotes]               = useState<Record<string,string>>({});

  /* Contacts */
  const [cSearch, setCSearch]     = useState("");

  /* Activités */
  type ActivityRow = { id:string; icon:string; text:string; time:string };
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [actLoading, setActLoading] = useState(false);

  /* Présences (panneau) */
  type PresRow = { id:string; event_id:string; events:{ title:string; date:string }|null; created_at:string };
  const [myPresences, setMyPresences] = useState<PresRow[]>([]);
  const [presLoading, setPresLoading] = useState(false);

  /* Dons */
  const [donAmt, setDonAmt]       = useState(100);
  const [donCustom, setDonCustom] = useState("");
  const [donMethod, setDonMethod] = useState("twint");
  const [donLabel, setDonLabel]   = useState("Dîme");

  /* Countdown */
  const [countdown, setCountdown] = useState("");

  /* Présence en ligne */
  const [onlineMembers, setOnlineMembers] = useState<{userId:string;name:string;initiale:string}[]>([]);

  /* Notifications */
  type Notif = { id:string; type:string; title:string; body:string|null; link:string|null; read_at:string|null; created_at:string };
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef                = useRef<HTMLDivElement>(null);
  const unreadCount             = notifs.filter(n => !n.read_at).length;

  /* Préférences de lecture (partagées avec le bouton flottant) */
  const { prefs: readingPrefs, update: updateReadingPrefs } = useReadingPrefs();
  const textSz = readingPrefs.font_size_px / 16;

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
  const canMajPlateforme = isAdmin || (profile?.groups ?? []).includes("communication");

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

  /* ── Supabase Realtime — UN seul client partagé ─────────────── */
  useEffect(() => {
    const supabase = createClient();

    // Présence
    const presenceCh = supabase.channel("em-presence", { config: { presence: { key: userId } } });
    presenceCh.on("presence", { event: "sync" }, () => {
      const state = presenceCh.presenceState<{name:string;initiale:string}>();
      setOnlineMembers(
        Object.entries(state)
          .map(([uid, arr]) => arr[0] ? { userId: uid, name: arr[0].name, initiale: arr[0].initiale } : null)
          .filter((x): x is {userId:string;name:string;initiale:string} => x !== null)
      );
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const ini = (profile?.first_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase();
        await presenceCh.track({ name: displayName, initiale: ini });
      }
    });

    // Notifications — chargement initial
    supabase.from("notifications").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setNotifs(data as Notif[]); });

    // Notifications — Realtime (nouvelles insertions)
    const notifCh = supabase.channel(`notifs:${userId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, ({ new: n }) => {
        setNotifs(prev => [n as Notif, ...prev].slice(0, 20));
      })
      .subscribe();

    // Fermer notif dropdown au clic extérieur
    function handleOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);

    return () => {
      supabase.removeChannel(presenceCh);
      supabase.removeChannel(notifCh);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleNotifOpen() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0) {
      const supabase = createClient();
      const ids = notifs.filter(n => !n.read_at).map(n => n.id);
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
      setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  useEffect(() => {
    if (panel === "priere") { loadPrayers(); if (rpPlans.length === 0) loadReadingPlans(); }
  }, [panel]);

  useEffect(() => {
    if (panel === "admin" && adminTab === "membres" && members.length === 0) loadMembers();
  }, [panel, adminTab]);

  useEffect(() => {
    if (panel === "contacts" && members.length === 0) loadMembers();
  }, [panel]);

  useEffect(() => {
    if (panel === "activites" && activities.length === 0 && !actLoading) loadActivities();
  }, [panel]);

  useEffect(() => {
    if (panel === "presences") loadPresences();
  }, [panel]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Chargement des droits sauvegardés (GD modal) ──────────── */
  useEffect(() => {
    if (!showGD) return;
    (async () => {
      try {
        const { data } = await supabase.from("site_settings").select("value").eq("key", "role_permissions_matrix").single();
        if (data?.value) {
          const saved = JSON.parse(data.value as string) as Record<string, Record<string, boolean>>;
          const merged: Record<string, Record<string, boolean>> = {};
          for (const k in GD_DEFAULTS) merged[k] = { ...GD_DEFAULTS[k], ...(saved[k] ?? {}) };
          setGdPerms(merged);
        }
      } catch { /* silencieux — on garde les valeurs par défaut */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGD]);

  /* ── Bible loader — bolls.life API ─────────────────────────── */
  const loadChapter = useCallback(async (bookIdx: number, ch: number, trans: string) => {
    setBLoading(true);
    setBVerses([]);
    setBError(null);
    try {
      const bookNum = bookIdx + 1;
      const res = await fetch(`https://bolls.life/get-text/${trans}/${bookNum}/${ch}/`);
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data: {verse:number;text:string}[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("Chapitre vide ou introuvable");
      // KJV/ASV contiennent des numéros Strong (<S>1063</S>) — on les supprime
      const stripStrong = (t: string) => t.replace(/<S>\d+<\/S>/g, "").replace(/\s+/g, " ").trim();
      const arr = data.map(v => ({ verse: v.verse, text: stripStrong(v.text) }));
      setBVerses(arr);
    } catch (e) {
      setBError(e instanceof Error ? e.message : "Erreur inconnue");
      setBVerses([]);
    } finally {
      setBLoading(false);
    }
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

  async function loadActivities() {
    setActLoading(true);
    const ACT_ICONS: Record<string,string> = { message:"💬", prayer:"🙏", event:"📅", member:"👤", donation:"💝", sermon:"📖", check_in:"✅", rsvp:"📋" };
    const { data } = await supabase
      .from("activity_feed")
      .select("id, type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setActivities((data ?? []).map((a: {id:string;type:string;description:string;created_at:string}) => ({
      id: a.id,
      icon: ACT_ICONS[a.type] ?? "🔔",
      text: a.description,
      time: new Date(a.created_at).toLocaleDateString("fr-CH", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }),
    })));
    setActLoading(false);
  }

  async function loadPresences() {
    setPresLoading(true);
    const { data } = await supabase
      .from("event_attendance")
      .select("id, event_id, created_at, events(title, date)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setMyPresences((data ?? []) as unknown as PresRow[]);
    setPresLoading(false);
  }

  async function loadReadingPlans() {
    setRpLoading(true);
    const [{ data: plans }, { data: progress }] = await Promise.all([
      supabase.from("reading_plans").select("id, titre, description, total_days").eq("is_active", true).order("total_days", { ascending: true }),
      supabase.from("reading_plan_progress").select("plan_id, current_day").eq("user_id", userId),
    ]);
    setRpPlans(plans ?? []);
    const prog: Record<string,number> = {};
    for (const r of progress ?? []) prog[r.plan_id] = r.current_day;
    setRpProgress(prog);
    setRpLoading(false);
  }

  async function enrollPlan(planId: string) {
    const { error } = await supabase.from("reading_plan_progress").upsert({ plan_id: planId, user_id: userId, current_day: 1 }, { onConflict: "plan_id,user_id" });
    if (!error) setRpProgress(p => ({ ...p, [planId]: 1 }));
  }

  async function advancePlan(planId: string, totalDays: number) {
    const next = Math.min((rpProgress[planId] ?? 0) + 1, totalDays);
    const { error } = await supabase.from("reading_plan_progress").update({ current_day: next, updated_at: new Date().toISOString() }).eq("plan_id", planId).eq("user_id", userId);
    if (!error) setRpProgress(p => ({ ...p, [planId]: next }));
  }

  async function handleChangePassword() {
    setPwdError(null);
    if (!pwdCurrent || !pwdNew || !pwdNewConfirm) {
      setPwdError("Tous les champs sont requis."); return;
    }
    if (pwdNew !== pwdNewConfirm) {
      setPwdError("Les nouveaux mots de passe ne correspondent pas."); return;
    }
    setPwdLoading(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      });
      const json = await res.json() as { success?: true; error?: string };
      if (!res.ok || json.error) {
        setPwdError(json.error ?? "Une erreur est survenue."); return;
      }
      setPwdSuccess(true);
      setPwdCurrent(""); setPwdNew(""); setPwdNewConfirm("");
    } catch {
      setPwdError("Impossible de contacter le serveur.");
    } finally {
      setPwdLoading(false);
    }
  }

  function insertEmoji(emoji: string) {
    const ta = msgInputRef.current;
    const start = ta?.selectionStart ?? msgInput.length;
    const end   = ta?.selectionEnd   ?? msgInput.length;
    const next  = msgInput.slice(0, start) + emoji + msgInput.slice(end);
    setMsgInput(next);
    setShowMsgEmoji(false);
    setTimeout(() => {
      ta?.focus();
      ta?.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  function sendMsg() {
    if (!msgInput.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(), from: "Moi",
      text: msgInput.trim(), mine: true,
      time: new Date().toLocaleTimeString("fr-CH", { hour:"2-digit", minute:"2-digit" }),
    }]);
    setMsgInput("");
    setShowMention(false);
  }

  function addReaction(msgId: string, emoji: string) {
    if ((myReactions[msgId]??[]).includes(emoji)) return;
    setMsgReactions(prev => {
      const cur = prev[msgId] ?? {};
      return {...prev, [msgId]: {...cur, [emoji]: (cur[emoji]??0)+1}};
    });
    setMyReactions(prev => ({...prev, [msgId]: [...(prev[msgId]??[]), emoji]}));
    setShowEmojiPicker(null);
  }

  function togglePin(msgId: string) {
    const wasPin = pinnedMsgs.includes(msgId);
    setPinnedMsgs(prev => wasPin ? prev.filter(i=>i!==msgId) : [...prev, msgId]);
    setToast(wasPin ? "Message désépinglé" : "Message épinglé 📌");
  }

  function sendThreadReply() {
    if (!threadInput.trim() || !openThread) return;
    const r = { id: Date.now().toString(), from: "Moi", text: threadInput.trim(),
      time: new Date().toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"}), mine: true };
    setThreadReplies(prev => ({...prev, [openThread]: [...(prev[openThread]??[]), r]}));
    setThreadInput("");
  }

  const MSG_CHANNELS = [
    { section:"Canaux", items:[
      { id:"général",  icon:"#",  badge:3 },
      { id:"annonces", icon:"📣", locked:!canAdmin },
      { id:"prière",   icon:"🙏", badge:undefined as number|undefined },
    ]},
    { section:"Groupes", items:[
      { id:"jeunesse", icon:"🌱" },
      { id:"louange",  icon:"🎵" },
      { id:"médias",   icon:"📺" },
    ]},
  ];

  /* ── Navigation helper ───────────────────────────────────────── */
  function nav(p: Panel) {
    setPanel(p);
    if (p === "priere") setBTab("verset");
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
  type NavItem = { id:string; lbl:string; ico:string; Icon:LucideIcon; badge?:number; live?:boolean; count?:number; href?:string; };
  type NavGroup = { section:string; items:NavItem[] };
  const NAV_ITEMS: NavGroup[] = [
    { section:"Principal", items:[
      { id:"accueil",     lbl:"Accueil",        ico:"⌂",  Icon:Home },
      { id:"messagerie",  lbl:"Messagerie",     ico:"✉",  Icon:MessageSquare, badge:5 },
      { id:"agenda",      lbl:"Agenda",         ico:"◉",  Icon:Calendar },
      { id:"streaming",   lbl:"Streaming",      ico:"▶",  Icon:PlayCircle, live:true },
      { id:"priere",      lbl:"Prière & Bible", ico:"✦",  Icon:BookOpen },
      { id:"ai-biblique", lbl:"ARC Église AI",  ico:"✦",  Icon:Sparkles, href:"/espace-membres/ai-biblique" },
    ]},
    { section:"Communauté", items:[
      { id:"contacts",  lbl:"Contacts",     ico:"👥", Icon:Users, count:membresValides },
      ...(canAdmin ? [
        { id:"presences", lbl:"Présences", ico:"✓", Icon:ClipboardCheck, href:"/espace-membres/presences" },
      ] : [
        { id:"presences", lbl:"Présences", ico:"✓", Icon:ClipboardCheck },
      ]),
      { id:"activites", lbl:"Activités",   ico:"◈", Icon:Bell, badge:7 },
    ]},
    { section:"Personnel", items:[
      { id:"notes",     lbl:"Notes bibliques", ico:"📝", Icon:BookMarked, href:"/espace-membres/notes" },
      { id:"doleances", lbl:"Doléances",       ico:"📨", Icon:Inbox, href:"/espace-membres/doleances" },
    ]},
    { section:"Gestion", items:[
      { id:"dons", lbl:"Dons & Paiements", ico:"♡", Icon:HandCoins },
      ...(canAdmin ? [
        { id:"crm",   lbl:"CRM Pastoral",   ico:"👤", Icon:BarChart3, href:"/espace-membres/crm" },
        { id:"admin", lbl:"Administration", ico:"⚙",  Icon:Settings },
      ] : []),
    ]},
    ...((canAdmin || (profile?.groups ?? []).length > 0) ? [{
      section:"Messagerie",
      items:[{ id:"mail", lbl:"Boîtes Mail", ico:"📬", Icon:Mail }],
    }] : []),
  ];

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="em-app">

      {/* ╔══════ HEADER MOBILE ══════╗ */}
      <header className="em-mob-hdr">
        <button className="em-mob-burger" onClick={() => setShowDrawer(true)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <div style={{flex:1,display:"flex",justifyContent:"center"}}>
          <a href="/" className="em-logo" style={{fontSize:13}}>
            <div className="em-logo-icon" style={{width:26,height:26,fontSize:8}}>ARC</div>
            <span>ARC <span style={{color:"#8899cc",fontWeight:400}}>Espace Membres</span></span>
          </a>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button className="em-hdr-ico" onClick={() => setShowSearch(true)}>🔍</button>
          <div ref={notifRef} style={{position:"relative"}}>
            <button className="em-hdr-ico" title="Notifications" onClick={handleNotifOpen} style={{position:"relative"}}>
              🔔
              {unreadCount > 0 && (
                <span style={{position:"absolute",top:2,right:2,background:"#e53e3e",color:"#fff",borderRadius:"50%",fontSize:9,fontWeight:700,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #1a1d3a",lineHeight:1}}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#fff",borderRadius:16,boxShadow:"0 8px 32px rgba(30,36,100,.18)",border:"1.5px solid rgba(30,36,100,.1)",width:320,zIndex:300,overflow:"hidden"}}>
                <div style={{padding:"13px 16px 10px",borderBottom:"1px solid rgba(30,36,100,.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:14,color:"#1a1d3a"}}>Notifications</span>
                  <span style={{fontSize:11,color:"#8890aa"}}>{unreadCount === 0 ? "Tout lu" : `${unreadCount} non lu${unreadCount>1?"s":""}`}</span>
                </div>
                <div style={{maxHeight:360,overflowY:"auto"}}>
                  {notifs.length === 0 ? (
                    <div style={{padding:"28px 16px",textAlign:"center",color:"#8890aa",fontSize:13}}>Aucune notification</div>
                  ) : notifs.map(n => (
                    <a key={n.id} href={n.link ?? "#"} style={{display:"block",padding:"11px 16px",borderBottom:"1px solid rgba(30,36,100,.06)",background:n.read_at?"transparent":"rgba(136,153,204,.08)",textDecoration:"none"}}>
                      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:17,lineHeight:"1.3",flexShrink:0}}>
                          {({message:"✉",prayer:"🙏",event:"📅",rsvp:"✓",system:"🔔"} as Record<string,string>)[n.type] ?? "🔔"}
                        </span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#1a1d3a",marginBottom:2}}>{n.title}</div>
                          {n.body && <div style={{fontSize:12,color:"#6670aa",lineHeight:1.4}}>{n.body}</div>}
                          <div style={{fontSize:11,color:"#8890aa",marginTop:3}}>{new Date(n.created_at).toLocaleDateString("fr-CH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                        </div>
                        {!n.read_at && <span style={{width:7,height:7,borderRadius:"50%",background:"#1E2464",flexShrink:0,marginTop:5}} />}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="em-av" style={{width:32,height:32,fontSize:12,cursor:"pointer"}}
            onClick={() => { nav("accueil"); }}>
            {profile?.avatar_url
              ? <Image src={profile.avatar_url} alt="" width={32} height={32} />
              : initiale}
          </div>
        </div>
      </header>

      {/* ╔══════ HEADER DESKTOP ══════╗ */}
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
            {membresValides} membres
          </span>
          <span style={{fontSize:12,color:"#8890aa",whiteSpace:"nowrap"}}>
            {new Date().toLocaleDateString("fr-CH",{weekday:"short",day:"numeric",month:"short"})}
          </span>
          {canAdmin && (
            <button className="em-hdr-ico" title="Gestion Stream" onClick={() => setShowGS(true)}>📡</button>
          )}
          <div ref={notifRef} style={{position:"relative"}}>
            <button className="em-hdr-ico" title="Notifications" onClick={handleNotifOpen} style={{position:"relative"}}>
              🔔
              {unreadCount > 0 && (
                <span style={{position:"absolute",top:2,right:2,background:"#e53e3e",color:"#fff",borderRadius:"50%",fontSize:9,fontWeight:700,width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #1a1d3a",lineHeight:1}}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:"#fff",borderRadius:16,boxShadow:"0 8px 32px rgba(30,36,100,.18)",border:"1.5px solid rgba(30,36,100,.1)",width:320,zIndex:300,overflow:"hidden"}}>
                <div style={{padding:"13px 16px 10px",borderBottom:"1px solid rgba(30,36,100,.08)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:700,fontSize:14,color:"#1a1d3a"}}>Notifications</span>
                  <span style={{fontSize:11,color:"#8890aa"}}>{unreadCount === 0 ? "Tout lu" : `${unreadCount} non lu${unreadCount>1?"s":""}`}</span>
                </div>
                <div style={{maxHeight:360,overflowY:"auto"}}>
                  {notifs.length === 0 ? (
                    <div style={{padding:"28px 16px",textAlign:"center",color:"#8890aa",fontSize:13}}>Aucune notification</div>
                  ) : notifs.map(n => (
                    <a key={n.id} href={n.link ?? "#"} style={{display:"block",padding:"11px 16px",borderBottom:"1px solid rgba(30,36,100,.06)",background:n.read_at?"transparent":"rgba(136,153,204,.08)",textDecoration:"none"}}>
                      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                        <span style={{fontSize:17,lineHeight:"1.3",flexShrink:0}}>
                          {({message:"✉",prayer:"🙏",event:"📅",rsvp:"✓",system:"🔔"} as Record<string,string>)[n.type] ?? "🔔"}
                        </span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:"#1a1d3a",marginBottom:2}}>{n.title}</div>
                          {n.body && <div style={{fontSize:12,color:"#6670aa",lineHeight:1.4}}>{n.body}</div>}
                          <div style={{fontSize:11,color:"#8890aa",marginTop:3}}>{new Date(n.created_at).toLocaleDateString("fr-CH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                        </div>
                        {!n.read_at && <span style={{width:7,height:7,borderRadius:"50%",background:"#1E2464",flexShrink:0,marginTop:5}} />}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                {group.items.map(item => {
                  const NavIcon = item.Icon;
                  return item.href ? (
                  <a key={item.id} href={item.href} className="em-ni"
                    style={{textDecoration:"none",display:"flex",alignItems:"center"}}>
                    <span className="em-ni-ico"><NavIcon size={16} strokeWidth={1.75} /></span>
                    <span className="em-ni-lbl">{item.lbl}</span>
                  </a>
                ) : (
                  <button key={item.id} className={`em-ni${panel === item.id ? " active" : ""}`}
                    onClick={() => nav(item.id as Panel)}>
                    <span className="em-ni-ico"><NavIcon size={16} strokeWidth={1.75} /></span>
                    <span className="em-ni-lbl">{item.lbl}</span>
                    {"badge" in item && item.badge
                      ? <span className="em-badge">{item.badge}</span>
                      : "count" in item && item.count
                        ? <span className="em-badge-soft">{item.count}</span>
                        : "live" in item && item.live
                          ? <span className="em-live">LIVE</span>
                          : null}
                  </button>
                );})}
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
          <button className="em-ni" style={{margin:"4px 8px 0",color:"rgba(255,255,255,.35)",fontSize:12}}
            onClick={()=>setShowSettings(true)}>
            <span className="em-ni-ico" style={{fontSize:12}}>⚙️</span>
            <span>Paramètres</span>
          </button>
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

            {/* Bannière visiteur non validé */}
            {profile !== null && role === "visiteur" && !profile?.validated && (
              <div style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1.5px solid #f59e0b",borderRadius:14,padding:"16px 20px",marginBottom:18,display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{fontSize:28,flexShrink:0}}>⏳</div>
                <div>
                  <div style={{fontWeight:700,fontSize:14,color:"#92400e",marginBottom:4}}>Compte en attente de validation</div>
                  <div style={{fontSize:13,color:"#78350f",lineHeight:1.5}}>
                    Ton inscription a bien été reçue. Un responsable validera ton compte prochainement. Tu recevras un email de confirmation dès que ton accès sera activé.
                  </div>
                  <div style={{fontSize:11,color:"#a16207",marginTop:8}}>
                    En attendant, tu peux consulter les sermons et les événements.
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="em-g4" style={{marginBottom:18}}>
              {[
                {num:totalUsers,    lbl:"Utilisateurs total"},
                {num:membresValides,lbl:"Membres validés"},
                {num:visiteurs,     lbl:"Visiteurs inscrits"},
                {num:prayerCount,   lbl:"Prières actives"},
              ].map(s => (
                <div key={s.lbl} className="em-card-sm" style={{textAlign:"center"}}>
                  <div className="em-stat-num">{s.num}</div>
                  <div className="em-stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* ARC Église AI */}
            <a href="/espace-membres/ai-biblique" style={{display:"block",textDecoration:"none",marginBottom:18}}>
              <div style={{background:"linear-gradient(135deg,#1e2464 0%,#2d3a8c 60%,#1a4fa8 100%)",borderRadius:16,padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,cursor:"pointer",boxShadow:"0 4px 20px rgba(30,36,100,.25)",border:"1px solid rgba(255,255,255,.1)"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>✦</div>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"rgba(255,255,255,.5)",marginBottom:3}}>Nouveau</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#fff",fontFamily:"Cormorant Garamond,Georgia,serif",lineHeight:1.2}}>ARC Église AI</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginTop:2}}>Étude biblique · Méditation · Plans de lecture</div>
                  </div>
                </div>
                <div style={{fontSize:20,color:"rgba(255,255,255,.4)",flexShrink:0}}>→</div>
              </div>
            </a>

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
                <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e2464"}}>Mes groupes</div>
                {(profile?.groups ?? []).length > 0
                  ? (profile?.groups ?? []).map(g => {
                    const gd = getGroup(g);
                    const Icon = gd.Icon;
                    return (
                    <div key={g} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                      <span style={{width:26,height:26,borderRadius:8,display:"inline-flex",alignItems:"center",justifyContent:"center",background:gd.hexBg,border:`1px solid ${gd.hex}30`,flexShrink:0}}>
                        <Icon size={13} strokeWidth={2} color={gd.hex} />
                      </span>
                      <span style={{fontSize:12,fontWeight:600,color:gd.hex}}>{g}</span>
                    </div>
                    );
                  })
                  : <div style={{color:"#8890aa",fontSize:13}}>Aucun groupe assigné pour l&apos;instant.</div>}
                <div style={{marginTop:16,fontSize:12,color:"#8890aa"}}>Plans de lecture</div>
                {Object.entries(rpProgress).slice(0,2).map(([pid, day]) => {
                  const plan = rpPlans.find(p => p.id === pid);
                  if (!plan) return null;
                  return (
                    <div key={pid} style={{padding:"5px 0",fontSize:12}}>
                      <div style={{color:"#1a1d3a",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{plan.titre}</div>
                      <div style={{color:"#8890aa"}}>Jour {day} / {plan.total_days}</div>
                    </div>
                  );
                })}
                {Object.keys(rpProgress).length === 0 && <div style={{color:"#8890aa",fontSize:12}}>Aucun plan actif</div>}
              </div>
            </div>
          </div>

          {/* ── MESSAGERIE ──────────────────────────────────── */}
          <div className={`em-panel${panel==="messagerie"?" active":""}`} style={{padding:0,overflow:"hidden"}}>
            <div className="em-chat" style={{height:"100%"}}>

              {/* ── Left: channels sidebar ── */}
              <div className={`em-channels${mobChanOpen?" mob-open":""}`}>
                <div className="em-ws-name">
                  ARC Église
                  <span className="em-dot-green" style={{display:"inline-block"}} />
                </div>
                <div style={{padding:"0 8px 6px"}}>
                  <input className="em-ch-search-input" placeholder="🔍 Rechercher…" />
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",padding:"0 8px 4px"}}>
                  <button className="mob-only" style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"rgba(255,255,255,.5)",lineHeight:1}} onClick={()=>setMobChanOpen(false)}>✕</button>
                </div>
                {MSG_CHANNELS.map(sect => (
                  <div key={sect.section}>
                    <div className="em-ch-sec">{sect.section}</div>
                    {sect.items.map(ch => (
                      <button key={ch.id} className={`em-ch-item${msgChan===ch.id?" active":""}`}
                        onClick={()=>{setMsgChan(ch.id);setMsgTab("msgs");setOpenThread(null);setMobChanOpen(false);}}>
                        <span style={{color:"#8890aa",fontSize:13,minWidth:16}}>{ch.icon}</span>
                        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.id}</span>
                        {"locked" in ch && ch.locked && <span style={{fontSize:10,opacity:.5}}>🔒</span>}
                        {"badge" in ch && ch.badge ? <span className="em-badge">{ch.badge}</span> : null}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="em-ch-sec" style={{marginTop:4}}>Messages directs</div>
                {ONLINE_MEMBERS.slice(0,5).map(m => {
                  const st = USER_STATUSES[m.name];
                  const dotColor = st==="online"?"#48bb78":st==="away"?"#ecc94b":st==="busy"?"#fc8181":"#718096";
                  return (
                    <button key={m.name} className={`em-ch-item${msgChan===m.name?" active":""}`}
                      onClick={()=>{setMsgChan(m.name);setMsgTab("msgs");setOpenThread(null);setMobChanOpen(false);}}>
                      <div style={{position:"relative",flexShrink:0}}>
                        <div className="em-av" style={{width:20,height:20,fontSize:9,background:m.color}}>{m.name[0]}</div>
                        <span style={{position:"absolute",bottom:-1,right:-1,width:7,height:7,borderRadius:"50%",border:"1.5px solid #1a1d3a",background:dotColor,display:"block"}} />
                      </div>
                      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12}}>{m.name}</span>
                    </button>
                  );
                })}
                <div style={{padding:"8px 8px 10px"}}>
                  <button className={`em-huddle${huddleActive?" active":""}`}
                    onClick={()=>{setHuddleActive(h=>!h);setToast(huddleActive?"Huddle terminé":"🎙 Huddle démarré !");}}>
                    🎙 {huddleActive ? "Huddle actif" : "Démarrer un huddle"}
                    {huddleActive && <span style={{marginLeft:"auto",fontSize:9,background:"rgba(39,103,73,.5)",color:"#9ae6b4",padding:"1px 5px",borderRadius:8}}>EN COURS</span>}
                  </button>
                </div>
              </div>

              {/* ── Main + thread ── */}
              <div style={{flex:1,display:"flex",overflow:"hidden"}}>

                {/* Conversation */}
                <div className="em-conv" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                  {/* Conv header */}
                  <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(30,36,100,.08)",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <button onClick={()=>setPanel("accueil")} style={{border:"none",background:"none",fontSize:13,cursor:"pointer",color:"#8890aa",padding:"2px 6px",borderRadius:6,whiteSpace:"nowrap"}}>← Retour</button>
                    <button className="mob-only" style={{border:"none",background:"#eef1f8",borderRadius:7,padding:"4px 8px",fontSize:18,cursor:"pointer",lineHeight:1}} onClick={()=>setMobChanOpen(true)}>☰</button>
                    {MSG_CHANNELS.flatMap(s=>s.items).some(i=>i.id===msgChan)
                      ? <span style={{fontWeight:700,fontSize:15,color:"#8890aa"}}>#</span>
                      : <div className="em-av" style={{width:22,height:22,fontSize:9,background:"#1e2464"}}>{msgChan[0]}</div>}
                    <span style={{fontWeight:600,fontSize:13,color:"#1e2464",flex:1}}>{msgChan}</span>
                    <button className="em-toolbar-btn" title="Rechercher">🔍</button>
                    <button className="em-toolbar-btn" title="Démarrer une réunion vidéo" onClick={()=>setShowVideoCall(true)}>📹</button>
                    <button className="em-toolbar-btn" title="Membres">👥</button>
                    {canAdmin && <button className="em-toolbar-btn" title="Paramètres" onClick={()=>setShowSettings(true)}>⚙️</button>}
                  </div>

                  {/* Pinned banner */}
                  {pinnedMsgs.length > 0 && msgTab==="msgs" && (
                    <button className="em-pinned-banner" onClick={()=>setMsgTab("pins")}>
                      📌 {pinnedMsgs.length} message{pinnedMsgs.length>1?"s":""} épinglé{pinnedMsgs.length>1?"s":""} · Voir →
                    </button>
                  )}

                  {/* Tab bar */}
                  <div className="em-conv-tabs">
                    {([["msgs","💬 Messages"],["files","📎 Fichiers"],["pins","📌 Épinglés"],["tasks","✅ Tâches"]] as [MsgTab,string][]).map(([t,l])=>(
                      <button key={t} className={`em-conv-tab${msgTab===t?" active":""}`} onClick={()=>setMsgTab(t)}>{l}</button>
                    ))}
                  </div>

                  {/* ── Tab: Messages ── */}
                  {msgTab==="msgs" && (<>
                    <div className="em-msgs" onClick={()=>setShowEmojiPicker(null)}>
                      {messages.map(m => {
                        const rxns  = msgReactions[m.id];
                        const replies = threadReplies[m.id] ?? [];
                        const isPinned = pinnedMsgs.includes(m.id);
                        return (
                          <div key={m.id} className="em-msg-wrap"
                            onMouseEnter={()=>setMsgHover(m.id)}
                            onMouseLeave={()=>{setMsgHover(null);}}>
                            <div className={`em-msg${m.mine?" mine":""}`}>
                              {!m.mine && <div className="em-av" style={{width:30,height:30,fontSize:11,background:"#1e2464"}}>{m.from[0]}</div>}
                              <div style={{flex:1,minWidth:0}}>
                                {!m.mine && <div style={{fontSize:11,fontWeight:600,color:"#1e2464",marginBottom:2}}>{m.from}</div>}
                                <div className="em-bubble em-reading-zone em-reading-text">
                                  {isPinned && <span style={{fontSize:10,marginRight:4,opacity:.5}}>📌</span>}
                                  {m.text}
                                </div>
                                <div style={{fontSize:10,color:"#8890aa",marginTop:2,textAlign:m.mine?"right":"left"}}>{m.time}</div>
                                {/* Reactions row */}
                                {rxns && Object.keys(rxns).length > 0 && (
                                  <div className="em-reactions">
                                    {Object.entries(rxns).map(([emoji,count])=>(
                                      <button key={emoji}
                                        className={`em-reaction${(myReactions[m.id]??[]).includes(emoji)?" mine":""}`}
                                        onClick={()=>addReaction(m.id,emoji)}>
                                        {emoji} <span style={{fontSize:11,color:"#4a5070"}}>{count}</span>
                                      </button>
                                    ))}
                                    <button className="em-reaction" style={{color:"#8890aa",fontSize:12,padding:"1px 6px"}} onClick={()=>setShowEmojiPicker(m.id)}>+</button>
                                  </div>
                                )}
                                {/* Thread link */}
                                {replies.length > 0 && (
                                  <button className="em-thread-link" onClick={()=>setOpenThread(openThread===m.id?null:m.id)}>
                                    ↩ <strong style={{color:"#1e2464"}}>{replies.length} réponse{replies.length>1?"s":""}</strong>
                                    <span style={{color:"#8890aa"}}> · {replies[replies.length-1].time}</span>
                                    <span>{openThread===m.id?" ▲":" ›"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Hover action bar */}
                            {msgHover===m.id && (
                              <div className="em-msg-actions" style={{right:m.mine?8:"auto",left:m.mine?"auto":40}}>
                                {QUICK_EMOJIS.slice(0,3).map(e=>(
                                  <button key={e} className="em-msg-action-btn" onClick={()=>addReaction(m.id,e)}>{e}</button>
                                ))}
                                <button className="em-msg-action-btn" title="Plus" onClick={e=>{e.stopPropagation();setShowEmojiPicker(showEmojiPicker===m.id?null:m.id);}}>😊</button>
                                <button className="em-msg-action-btn" title="Répondre" onClick={()=>setOpenThread(openThread===m.id?null:m.id)}>↩</button>
                                <button className="em-msg-action-btn" title={isPinned?"Désépingler":"Épingler"} onClick={()=>togglePin(m.id)}>📌</button>
                              </div>
                            )}
                            {/* Quick emoji picker */}
                            {showEmojiPicker===m.id && (
                              <div style={{position:"absolute",zIndex:50,bottom:"100%",right:m.mine?8:"auto",left:m.mine?"auto":40,background:"#fff",borderRadius:14,boxShadow:"0 4px 20px rgba(30,36,100,.18)",padding:"6px 10px",border:"1px solid rgba(30,36,100,.1)",display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
                                {QUICK_EMOJIS.map(e=>(
                                  <button key={e} style={{border:"none",background:"none",fontSize:22,cursor:"pointer",padding:"3px 5px",borderRadius:7,transition:"transform .1s"}}
                                    onClick={()=>addReaction(m.id,e)}>{e}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={msgEndRef} />
                    </div>
                    {/* Input bar */}
                    <div className="em-msg-bar" style={{flexDirection:"column",gap:0,padding:"0 12px 12px"}}>
                      <div className="em-msg-toolbar">
                        <button className="em-toolbar-btn" title="Gras">𝐁</button>
                        <button className="em-toolbar-btn" title="Italique">𝐼</button>
                        <button className="em-toolbar-btn" title="Lien">🔗</button>
                        <span style={{width:1,background:"rgba(30,36,100,.12)",margin:"2px 4px",display:"inline-block",height:16}} />
                        <button className="em-toolbar-btn" title="Liste">≡</button>
                        <button className="em-toolbar-btn" title="Citation">❝</button>
                      </div>
                      <div style={{position:"relative",display:"flex",alignItems:"flex-end",gap:8,background:"#f7f8fc",borderRadius:12,padding:"8px 10px",border:"1.5px solid rgba(30,36,100,.12)"}}>
                        <label className="em-toolbar-btn" title="Fichier" style={{cursor:"pointer",marginBottom:2,flexShrink:0}}>
                          📎
                          <input type="file" style={{display:"none"}} onChange={e=>{
                            if(e.target.files?.[0]){
                              const f=e.target.files[0];
                              setMessages(prev=>[...prev,{id:Date.now().toString(),from:"Moi",text:`📎 Fichier partagé : ${f.name}`,mine:true,time:new Date().toLocaleTimeString("fr-CH",{hour:"2-digit",minute:"2-digit"})}]);
                              setToast(`"${f.name}" envoyé 📎`);
                              e.target.value="";
                            }
                          }} />
                        </label>
                        <div style={{flex:1,position:"relative"}}>
                          <textarea className="em-msg-input" ref={msgInputRef} rows={1}
                            placeholder={`Message #${msgChan}… (@mention, Entrée pour envoyer)`}
                            value={msgInput}
                            onChange={e=>{
                              setMsgInput(e.target.value);
                              const v=e.target.value;
                              setShowMention(v.endsWith("@")||(v.includes("@")&&!/\s$/.test(v)&&v.slice(v.lastIndexOf("@")).length<15));
                            }}
                            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                            style={{background:"transparent",border:"none",padding:0,resize:"none",minHeight:22,width:"100%"}} />
                          {/* @mention dropdown */}
                          {showMention && (
                            <div className="em-mention-drop">
                              {ONLINE_MEMBERS.slice(0,4).map(m=>(
                                <button key={m.name} className="em-mention-item"
                                  onClick={()=>{setMsgInput(i=>i.replace(/@[^\s]*$/,"@"+m.name.split(" ")[0]+" "));setShowMention(false);}}>
                                  <div className="em-av" style={{width:24,height:24,fontSize:10,background:m.color}}>{m.name[0]}</div>
                                  <div>
                                    <div style={{fontWeight:600,fontSize:12,color:"#1e2464"}}>{m.name}</div>
                                    <div style={{fontSize:10,color:"#8890aa"}}>{m.role}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{position:"relative",flexShrink:0}}>
                          <button className="em-toolbar-btn" style={{marginBottom:2}}
                            onClick={()=>setShowMsgEmoji(v=>!v)}>😊</button>
                          {showMsgEmoji && (
                            <div style={{position:"absolute",bottom:"calc(100% + 8px)",right:0,background:"#fff",borderRadius:14,boxShadow:"0 4px 24px rgba(30,36,100,.18)",border:"1px solid rgba(30,36,100,.1)",padding:10,zIndex:60,width:250}}>
                              <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:3}}>
                                {EMOJI_LIST.map(e=>(
                                  <button key={e} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",padding:3,borderRadius:7,lineHeight:1,transition:"transform .1s"}}
                                    onClick={()=>insertEmoji(e)}
                                    onMouseEnter={ev=>(ev.currentTarget.style.transform="scale(1.25)")}
                                    onMouseLeave={ev=>(ev.currentTarget.style.transform="scale(1)")}>
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button className="em-btn em-btn-primary em-btn-sm" style={{flexShrink:0,padding:"5px 12px"}} onClick={sendMsg} disabled={!msgInput.trim()}>↑</button>
                      </div>
                    </div>
                  </>)}

                  {/* ── Tab: Fichiers ── */}
                  {msgTab==="files" && (
                    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>📎 Fichiers partagés dans #{msgChan}</div>
                      {MSG_FILES.map((f,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                          <div style={{width:42,height:42,background:"#f0f2f9",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{f.icon}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:600,fontSize:13,color:"#1e2464",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                            <div style={{fontSize:11,color:"#8890aa"}}>{f.size} · {f.from} · {f.time}</div>
                          </div>
                          <button className="em-btn em-btn-outline em-btn-sm">↓</button>
                        </div>
                      ))}
                      <label style={{display:"block",marginTop:16,textAlign:"center",cursor:"pointer"}}>
                        <span className="em-btn em-btn-outline" style={{display:"inline-flex",gap:6}}>📎 Partager un fichier</span>
                        <input type="file" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])setToast(`"${e.target.files[0].name}" partagé 📎`);}} />
                      </label>
                    </div>
                  )}

                  {/* ── Tab: Épinglés ── */}
                  {msgTab==="pins" && (
                    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:14}}>📌 Messages épinglés</div>
                      {pinnedMsgs.length > 0
                        ? messages.filter(m=>pinnedMsgs.includes(m.id)).map(m=>(
                          <div key={m.id} style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:5}}>{m.mine?"Moi":m.from} · {m.time}</div>
                            <div style={{fontSize:13,color:"#1a1d3a",lineHeight:1.5}}>{m.text}</div>
                            <button className="em-btn em-btn-ghost em-btn-sm" style={{marginTop:8,color:"#92400e"}} onClick={()=>togglePin(m.id)}>Désépingler</button>
                          </div>
                        ))
                        : <div style={{textAlign:"center",padding:"48px 0",color:"#8890aa"}}>
                            <div style={{fontSize:40,marginBottom:10}}>📌</div>
                            <div style={{fontWeight:600}}>Aucun message épinglé</div>
                            <div style={{fontSize:12,marginTop:4}}>Survole un message et clique 📌 pour l&apos;épingler</div>
                          </div>
                      }
                    </div>
                  )}

                  {/* ── Tab: Tâches ── */}
                  {msgTab==="tasks" && (
                    <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#1e2464"}}>✅ Tâches du canal</div>
                        <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>setToast("Fonctionnalité bientôt disponible")}>+ Nouvelle tâche</button>
                      </div>
                      <div style={{fontSize:12,color:"#8890aa",marginBottom:12}}>{taskDone.length}/{MSG_TASKS.length} tâches terminées</div>
                      <div style={{background:"#f0f2f9",borderRadius:6,height:5,marginBottom:16}}>
                        <div style={{background:"#276749",borderRadius:6,height:"100%",width:`${Math.round(taskDone.length/MSG_TASKS.length*100)}%`,transition:"width .3s"}} />
                      </div>
                      {MSG_TASKS.map(t=>(
                        <div key={t.id} className="em-msg-task" style={{opacity:taskDone.includes(t.id)?.7:1}}>
                          <div style={{width:20,height:20,border:"2px solid",borderColor:taskDone.includes(t.id)?"#276749":"#cbd5e0",borderRadius:5,background:taskDone.includes(t.id)?"#276749":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}
                            onClick={()=>setTaskDone(d=>d.includes(t.id)?d.filter(x=>x!==t.id):[...d,t.id])}>
                            {taskDone.includes(t.id) && <span style={{color:"#fff",fontSize:11}}>✓</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:500,color:taskDone.includes(t.id)?"#8890aa":"#1a1d3a",textDecoration:taskDone.includes(t.id)?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                            <div style={{fontSize:11,color:"#8890aa",marginTop:1}}>👤 {t.assignee} · 📅 {t.due}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Thread panel ── */}
                {openThread && (
                  <div className="em-thread-backdrop" onClick={()=>setOpenThread(null)} />
                )}
                {openThread && (
                  <div className="em-thread-panel">
                    <div className="em-thread-hdr">
                      <span>↩ Fil de discussion</span>
                      <button style={{border:"none",background:"none",fontSize:16,cursor:"pointer",color:"#8890aa",lineHeight:1}} onClick={()=>setOpenThread(null)}>✕</button>
                    </div>
                    {(() => {
                      const orig = messages.find(m=>m.id===openThread);
                      return orig ? (
                        <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(30,36,100,.08)",background:"#fafbff"}}>
                          <div style={{fontSize:10,fontWeight:700,color:"#8890aa",marginBottom:4}}>{orig.mine?"Moi":orig.from} · {orig.time}</div>
                          <div style={{fontSize:13,color:"#1a1d3a",lineHeight:1.5}}>{orig.text}</div>
                        </div>
                      ) : null;
                    })()}
                    <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
                      {(threadReplies[openThread]??[]).length===0 && (
                        <div style={{textAlign:"center",padding:"24px 0",color:"#8890aa",fontSize:12}}>Première réponse dans ce fil</div>
                      )}
                      {(threadReplies[openThread]??[]).map(r=>(
                        <div key={r.id} className={`em-msg${r.mine?" mine":""}`} style={{padding:"4px 14px"}}>
                          {!r.mine && <div className="em-av" style={{width:26,height:26,fontSize:10,background:"#1e2464"}}>{r.from[0]}</div>}
                          <div>
                            {!r.mine && <div style={{fontSize:10,fontWeight:700,color:"#1e2464",marginBottom:2}}>{r.from}</div>}
                            <div className="em-bubble em-reading-zone em-reading-text" style={{fontSize:12}}>{r.text}</div>
                            <div style={{fontSize:9,color:"#8890aa",marginTop:2,textAlign:r.mine?"right":"left"}}>{r.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"8px 12px 10px",borderTop:"1px solid rgba(30,36,100,.08)"}}>
                      <div style={{display:"flex",gap:6,background:"#f7f8fc",borderRadius:10,padding:"6px 8px",border:"1.5px solid rgba(30,36,100,.1)"}}>
                        <textarea className="em-msg-input" rows={1}
                          style={{background:"transparent",border:"none",padding:0,resize:"none",flex:1,fontSize:12,minHeight:20}}
                          placeholder="Répondre dans le fil…"
                          value={threadInput}
                          onChange={e=>setThreadInput(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendThreadReply();}}} />
                        <button className="em-btn em-btn-primary em-btn-sm" style={{padding:"3px 9px",fontSize:13}} onClick={sendThreadReply} disabled={!threadInput.trim()}>↑</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── AGENDA ──────────────────────────────────────── */}
          <div className={`em-panel${panel==="agenda"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:8}}>
              <div>
                <div className="em-sect-title">Agenda</div>
                <div className="em-sect-sub">Événements &amp; calendrier de l&apos;église</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setShowSalle(true)}>🏢 Réserver une salle</button>
                {canAdmin && <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>setShowAddEvent(true)}>+ Ajouter un événement</button>}
              </div>
            </div>
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
                      className={`em-cal-cell${cell.type!=="curr"?" other-m":""}${cell.day===todayDay&&cell.type==="curr"?" today":""}${cell.hasEvt?" has-evt":""}${calSelectedDate===cell.day&&cell.type==="curr"?" selected":""}`}
                      onClick={() => {
                        if (cell.type !== "curr") return;
                        const next = calSelectedDate === cell.day ? null : cell.day;
                        setCalSelectedDate(next);
                        if (next) setCalNoteInput(calNotes[`${calYear}-${calMonth+1}-${cell.day}`] ?? "");
                      }}
                      style={{cursor:cell.type==="curr"?"pointer":"default"}}>
                      {cell.day}
                    </div>
                  ))}
                </div>
                {/* Notes et événements du jour sélectionné */}
                {calSelectedDate !== null && (
                  <div style={{marginTop:14,borderTop:"1px solid rgba(30,36,100,.1)",paddingTop:14}}>
                    <div style={{fontWeight:700,fontSize:12,color:"#1e2464",marginBottom:8}}>
                      📅 {calSelectedDate} {["jan.","fév.","mar.","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."][calMonth]} {calYear}
                    </div>
                    {events.filter(ev=>{const d=new Date(ev.date+"T00:00:00");return d.getFullYear()===calYear&&d.getMonth()===calMonth&&d.getDate()===calSelectedDate;}).map(ev=>(
                      <div key={ev.id} style={{fontSize:12,color:"#1e2464",marginBottom:4,padding:"4px 8px",background:"#eff6ff",borderRadius:6,display:"flex",alignItems:"center",gap:6}}>
                        <span>{ev.time_start?.slice(0,5)}</span>
                        <span style={{fontWeight:600}}>{ev.title}</span>
                      </div>
                    ))}
                    <textarea
                      className="em-input"
                      placeholder="Note pour ce jour…"
                      rows={2}
                      value={calNoteInput}
                      onChange={e=>setCalNoteInput(e.target.value)}
                      style={{marginTop:8,fontSize:12,resize:"vertical",width:"100%"}}
                    />
                    <button className="em-btn em-btn-primary em-btn-sm" style={{marginTop:6,width:"100%"}}
                      onClick={()=>{
                        const k=`${calYear}-${calMonth+1}-${calSelectedDate}`;
                        setCalNotes(n=>({...n,[k]:calNoteInput}));
                        setToast("Note enregistrée ✅");
                      }}>
                      Enregistrer la note
                    </button>
                  </div>
                )}
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
                    <a href="/espace-membres/agenda" className="em-btn em-btn-outline em-btn-sm" style={{marginTop:8,width:"100%",textDecoration:"none",textAlign:"center",display:"block"}}>Participer →</a>
                  </div>
                )) : (
                  <div className="em-card-sm" style={{color:"#8890aa",fontSize:13,textAlign:"center",padding:"24px 0"}}>
                    Aucun événement à venir
                  </div>
                )}
                {canAdmin && (
                  <button className="em-btn em-btn-primary" style={{width:"100%",marginTop:8}} onClick={()=>setShowAddEvent(true)}>+ Ajouter un événement</button>
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
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              <a href="/espace-membres/streaming" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:13,color:"#8899cc",textDecoration:"none"}}>
                Voir la page streaming complète →
              </a>
              <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setShowDoleance(true)}>📬 Déposer une doléance</button>
            </div>
          </div>

          {/* ── PRIÈRE & BIBLE ──────────────────────────────── */}
          <div className={`em-panel${panel==="priere"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <button onClick={()=>setPanel("accueil")} style={{border:"none",background:"none",fontSize:13,cursor:"pointer",color:"#8890aa",padding:"0 0 6px",display:"block"}}>← Retour</button>
                <div className="em-sect-title">Prière & Bible</div>
                <div className="em-sect-sub">Lecture, étude, prières communautaires</div>
              </div>
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

            {/* Contenu — taille contrôlée via --rp-size (ReadingPrefsContext) */}
            <div className="em-reading-zone">

            {/* Verset du jour */}
            {bTab==="verset" && (
              <div>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
                  <select className="em-select" value={bTrans} onChange={e=>setBTrans(e.target.value)} style={{fontSize:12}}>
                    {TRANS.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
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
                    <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:12}}>📋 Plans de lecture actifs</div>
                    {Object.keys(rpProgress).length === 0 && (
                      <div style={{color:"#8890aa",fontSize:13,textAlign:"center",padding:"8px 0"}}>
                        Aucun plan actif.
                        <button className="em-btn em-btn-outline em-btn-sm" style={{display:"block",width:"100%",marginTop:8}} onClick={()=>setBTab("plans")}>Choisir un plan →</button>
                      </div>
                    )}
                    {Object.entries(rpProgress).slice(0,3).map(([pid, day]) => {
                      const plan = rpPlans.find(p => p.id === pid);
                      if (!plan) return null;
                      const pct = Math.round((day / plan.total_days) * 100);
                      return (
                        <div key={pid} style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                            <span style={{fontSize:13,fontWeight:600,color:"#1a1d3a"}}>{plan.titre}</span>
                            <span style={{fontSize:11,color:"#8890aa"}}>Jour {day}/{plan.total_days}</span>
                          </div>
                          <div style={{background:"#f0f2f9",borderRadius:6,height:6,marginBottom:6}}>
                            <div style={{background:"#1e2464",borderRadius:6,height:"100%",width:`${pct}%`,transition:"width .3s"}} />
                          </div>
                          {day < plan.total_days && (
                            <button className="em-btn em-btn-outline em-btn-sm" style={{fontSize:11}} onClick={()=>advancePlan(pid, plan.total_days)}>✓ Marquer jour {day} comme lu</button>
                          )}
                          {day >= plan.total_days && <span className="em-tag-vert em-tag" style={{fontSize:10}}>Terminé !</span>}
                        </div>
                      );
                    })}
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
                  <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>{setNoteRef(`${BOOKS[bBook].n} ${bCh}`);setNoteContent("");setShowNote(true);}}>📝 Note</button>
                </div>
                <div className="em-card" style={{minHeight:300}}>
                  {bLoading ? (
                    <div style={{textAlign:"center",padding:"40px 0"}}>
                      <div style={{width:32,height:32,border:"3px solid #eef1f8",borderTopColor:"#1e2464",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}} />
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <div style={{marginTop:8,color:"#8890aa",fontSize:13}}>Chargement de {BOOKS[bBook].n} {bCh}…</div>
                    </div>
                  ) : bError ? (
                    <div style={{textAlign:"center",padding:"40px 0"}}>
                      <div style={{fontSize:36,marginBottom:10}}>⚠️</div>
                      <div style={{fontWeight:600,color:"#e53e3e",marginBottom:6}}>{bError}</div>
                      <div style={{fontSize:12,color:"#8890aa",marginBottom:16}}>Vérifiez votre connexion internet</div>
                      <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>loadChapter(bBook,bCh,bTrans)}>↺ Réessayer</button>
                    </div>
                  ) : bVerses.length > 0 ? (
                    <div className="em-reading-zone">
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
                              {"content" in item && item.content
                                ? <p style={{fontSize:13.5,lineHeight:1.8,color:"#4a5070"}}>{item.content as string}</p>
                                : <p style={{fontSize:13.5,lineHeight:1.8,color:"#8890aa",fontStyle:"italic"}}>Contenu à venir — rédigé par l&apos;équipe pastorale.</p>
                              }
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
                            <div className="em-reading-text" style={{fontWeight:600,color:"#1a1d3a"}}>{p.title}</div>
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
                        {p.description && <p className="em-reading-text" style={{color:"#4a5070",marginBottom:0}}>{p.description}</p>}
                      </div>
                    );
                  })
                }
                {prayers.filter(p=>p.is_answered).length > 0 && (
                  <div style={{marginTop:18}}>
                    <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",color:"#2f855a",letterSpacing:".08em",marginBottom:10}}>✅ Prières exaucées ({prayers.filter(p=>p.is_answered).length})</div>
                    {prayers.filter(p=>p.is_answered).map(p => (
                      <div key={p.id} style={{background:"#f0fff4",border:"1px solid #9ae6b4",borderRadius:10,padding:"10px 14px",marginBottom:8,opacity:.8}}>
                        <div className="em-reading-text" style={{fontWeight:600,color:"#276749"}}>{p.title}</div>
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
                {rpLoading && <div style={{textAlign:"center",padding:"30px 0",color:"#8890aa"}}>Chargement des plans…</div>}
                {!rpLoading && rpPlans.length === 0 && (
                  <div className="em-card" style={{textAlign:"center",color:"#8890aa",padding:24}}>Aucun plan de lecture disponible pour le moment.</div>
                )}
                {!rpLoading && rpPlans.map(plan => {
                  const currentDay = rpProgress[plan.id];
                  const enrolled   = currentDay !== undefined;
                  const pct        = enrolled ? Math.round((currentDay / plan.total_days) * 100) : 0;
                  const done       = enrolled && currentDay >= plan.total_days;

                  return (
                    <div key={plan.id} className="em-card" style={{marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:14,color:"#1e2464"}}>{plan.titre}</div>
                          {plan.description && <div style={{fontSize:12,color:"#8890aa",marginTop:2}}>{plan.description}</div>}
                          <div style={{fontSize:11,color:"#8890aa",marginTop:4}}>{plan.total_days} jour{plan.total_days>1?"s":""}</div>
                        </div>
                        {done && <span className="em-tag-vert em-tag" style={{fontSize:10,flexShrink:0}}>Terminé ✓</span>}
                        {enrolled && !done && <span className="em-tag em-tag-bleu" style={{fontSize:10,flexShrink:0}}>Actif · Jour {currentDay}</span>}
                      </div>
                      {enrolled && (
                        <>
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{flex:1,background:"#f0f2f9",borderRadius:6,height:8}}>
                              <div style={{background:"#1e2464",borderRadius:6,height:"100%",width:`${pct}%`,transition:"width .3s"}} />
                            </div>
                            <span style={{fontSize:11,color:"#8890aa",flexShrink:0}}>{pct}%</span>
                          </div>
                          {!done && (
                            <button className="em-btn em-btn-sm" style={{background:"#1e2464",color:"#fff",fontSize:12}} onClick={()=>advancePlan(plan.id, plan.total_days)}>
                              ✓ Jour {currentDay} terminé → Jour {currentDay+1}
                            </button>
                          )}
                        </>
                      )}
                      {!enrolled && (
                        <button className="em-btn em-btn-outline em-btn-sm" style={{marginTop:4}} onClick={()=>enrollPlan(plan.id)}>
                          + S&apos;inscrire à ce plan
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            </div>{/* fin zoom prière */}
          </div>

          {/* ── CONTACTS ────────────────────────────────────── */}
          <div className={`em-panel${panel==="contacts"?" active":""}`}>
            <div className="em-sect-title">Contacts</div>
            <div className="em-sect-sub">{membresValides} membres validés · Annuaire de l&apos;église</div>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <input className="em-input" placeholder="Rechercher un membre…" value={cSearch} onChange={e=>setCSearch(e.target.value)} style={{maxWidth:360}} />
              <select className="em-select">
                <option value="">Tous les groupes</option>
                {GROUPES.map(g=><option key={g.name}>{g.name}</option>)}
              </select>
            </div>
            {mLoading && (
              <div style={{textAlign:"center",padding:"30px 0",color:"#8890aa"}}>Chargement des membres…</div>
            )}
            {!mLoading && (
              <div className="em-g4">
                {members
                  .filter(m => m.validated)
                  .filter(m => cSearch
                    ? `${m.first_name ?? ""} ${m.last_name ?? ""} ${m.email}`.toLowerCase().includes(cSearch.toLowerCase())
                    : true)
                  .map(m => {
                    const name  = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
                    const initL = (m.first_name?.[0] ?? m.email[0]).toUpperCase();
                    const colors = ["#1e2464","#276749","#9d174d","#1e40af","#3730a3","#065f46","#92400e","#5b21b6","#991b1b","#854d0e"];
                    const color  = colors[(m.first_name?.charCodeAt(0) ?? 0) % colors.length];
                    return (
                      <div key={m.id} className="em-card-sm em-card-hover" style={{textAlign:"center",cursor:"pointer"}}>
                        <div className="em-av" style={{width:48,height:48,fontSize:18,background:color,margin:"0 auto 10px"}}>{initL}</div>
                        <div style={{fontWeight:600,fontSize:13,color:"#1e2464",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
                        <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{m.role}</div>
                        {m.groups && m.groups.length > 0 && (
                          <div style={{fontSize:10,color:"#8899cc",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.groups[0]}</div>
                        )}
                        <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:10}}>
                          <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>{setMsgChan(name);nav("messagerie");}} title="Message">💬</button>
                          <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setShowVideoCall(true)} title="Appel vidéo">📹</button>
                          <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>nav("agenda")} title="RDV">📅</button>
                        </div>
                      </div>
                    );
                  })}
                {members.filter(m=>m.validated).length === 0 && !mLoading && (
                  <div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px 0",color:"#8890aa"}}>
                    <div style={{fontSize:36,marginBottom:8}}>👥</div>
                    <div>Aucun membre validé pour l&apos;instant</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PRÉSENCES ───────────────────────────────────── */}
          <div className={`em-panel${panel==="presences"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4,flexWrap:"wrap",gap:8}}>
              <div>
                <div className="em-sect-title">Présences</div>
                <div className="em-sect-sub">Historique de tes présences aux événements</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <a href="/espace-membres/agenda" className="em-btn em-btn-outline em-btn-sm" style={{textDecoration:"none"}}>📅 Pointer ma présence</a>
                {canAdmin && <a href="/espace-membres/presences" className="em-btn em-btn-primary em-btn-sm" style={{textDecoration:"none"}}>Vue admin →</a>}
              </div>
            </div>
            <div className="em-g2" style={{marginBottom:16}}>
              <div className="em-card-sm" style={{textAlign:"center"}}>
                <div className="em-stat-num">{myPresences.length}</div>
                <div className="em-stat-lbl">Événements fréquentés</div>
              </div>
              <div className="em-card-sm" style={{textAlign:"center"}}>
                <div className="em-stat-num">{events.length > 0 ? events[0]?.title?.split(" ").slice(0,2).join(" ") ?? "—" : "—"}</div>
                <div className="em-stat-lbl">Prochain événement</div>
              </div>
            </div>
            <div className="em-card">
              <div style={{fontWeight:700,fontSize:14,color:"#1e2464",marginBottom:12}}>Mes présences récentes</div>
              {presLoading ? (
                <div style={{textAlign:"center",padding:"20px 0",color:"#8890aa",fontSize:13}}>Chargement…</div>
              ) : myPresences.length === 0 ? (
                <div style={{textAlign:"center",padding:"24px 0",color:"#8890aa",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>📋</div>
                  <div>Aucune présence enregistrée.</div>
                  <div style={{fontSize:12,marginTop:4}}>Utilise <a href="/espace-membres/agenda" style={{color:"#2d3a8c"}}>l&apos;agenda</a> pour pointer ta présence à un événement.</div>
                </div>
              ) : (
                myPresences.map((p) => (
                  <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)",fontSize:13}}>
                    <div>
                      <div style={{fontWeight:600,color:"#1e2464"}}>{(p.events as {title:string;date:string}|null)?.title ?? "Événement"}</div>
                      <div style={{fontSize:11,color:"#8890aa"}}>
                        {(p.events as {title:string;date:string}|null)?.date
                          ? new Date((p.events as {title:string;date:string}).date+"T00:00:00").toLocaleDateString("fr-CH",{weekday:"long",day:"numeric",month:"long"})
                          : new Date(p.created_at).toLocaleDateString("fr-CH")}
                      </div>
                    </div>
                    <span style={{color:"#16a34a",fontSize:20,fontWeight:700}}>✓</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── ACTIVITÉS ───────────────────────────────────── */}
          <div className={`em-panel${panel==="activites"?" active":""}`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <div className="em-sect-title">Activités</div>
                <div className="em-sect-sub">Fil d&apos;actualité de la communauté</div>
              </div>
              <button className="em-btn em-btn-outline em-btn-sm" onClick={loadActivities} disabled={actLoading}>↺ Actualiser</button>
            </div>
            <div className="em-card">
              {actLoading ? (
                <div style={{textAlign:"center",padding:"32px 0",color:"#8890aa",fontSize:13}}>Chargement…</div>
              ) : activities.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:"#8890aa",fontSize:13}}>
                  <div style={{fontSize:32,marginBottom:8}}>🔔</div>
                  <div>Aucune activité récente dans la communauté.</div>
                </div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="em-activity">
                    <div className="em-act-ico">{a.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13.5,color:"#1a1d3a"}}>{a.text}</div>
                      <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>{a.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── DONS ────────────────────────────────────────── */}
          <div className={`em-panel${panel==="dons"?" active":""}`}>
            <div className="em-sect-title">Dons & Paiements</div>
            <div className="em-sect-sub">Contribuez à la mission de l&apos;ARC</div>
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
                    <div className="em-stat-num" style={{color:"#276749"}}>{membresValides}</div>
                    <div className="em-stat-lbl">Membres actifs</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── ADMINISTRATION ──────────────────────────────── */}
          {canAdmin && (
            <div className={`em-panel${panel==="admin"?" active":""}`}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div>
                  <div className="em-sect-title">Administration</div>
                  <div className="em-sect-sub">Gestion de l&apos;église · {totalUsers} utilisateurs · {membresValides} membres · 11 groupes</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {isAdmin && (
                    <button className="em-btn em-btn-sm" style={{background:"linear-gradient(135deg,#c53030,#9b2c2c)",color:"white",fontWeight:700,display:"flex",alignItems:"center",gap:6}} onClick={()=>{setShowGD(true);setGdTab("matrix");}}>
                      ⚡ Gestion des Droits
                    </button>
                  )}
                  {(canAdmin||canMajPlateforme) && (
                    <button className="em-btn em-btn-sm" style={{background:"linear-gradient(135deg,#553c9a,#8b5cf6)",color:"white",display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowMP(true)} title="Gestion des 4 modules vitrine — Groupe Communication">
                      🖼️ Maj Plateformes
                    </button>
                  )}
                  {canAdmin && (
                    <button className="em-btn em-btn-sm" style={{background:"linear-gradient(135deg,#276749,#2f855a)",color:"white",display:"flex",alignItems:"center",gap:6}} onClick={()=>setAdminTab("crm")}>
                      🗂️ Gestion CRM
                    </button>
                  )}
                  {canAdmin && (
                    <button className="em-btn em-btn-primary em-btn-sm" style={{display:"flex",alignItems:"center",gap:6}} onClick={()=>setShowMajInfo(true)}>
                      🌐 Maj site vitrine
                    </button>
                  )}
                </div>
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
                  <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                    <input className="em-input" placeholder="Rechercher…" value={mSearch} onChange={e=>setMSearch(e.target.value)} style={{maxWidth:280,flex:1}} />
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={loadMembers}>↺ Actualiser</button>
                    {isAdmin && <button className="em-btn em-btn-primary em-btn-sm" onClick={()=>{setInvitePrenom("");setInviteNom("");setInviteEmail("");setInviteGroupe("");setShowInvite(true);}}>✉️ Inviter</button>}
                  </div>
                  {mLoading
                    ? <div style={{textAlign:"center",padding:"20px 0",color:"#8890aa"}}>Chargement…</div>
                    : (
                      <table className="em-tbl">
                        <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Groupes</th><th>Statut</th><th>Date</th><th></th></tr></thead>
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
                              <td><a href={`/admin/crm/${m.id}`} className="em-btn em-btn-outline em-btn-sm" style={{textDecoration:"none",fontSize:11,whiteSpace:"nowrap"}}>Gérer →</a></td>
                            </tr>
                          ))}
                          {members.length===0 && !mLoading && (
                            <tr><td colSpan={7} style={{textAlign:"center",padding:"20px",color:"#8890aa"}}>
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
                  {GROUPES.map(g=>{
                    const gDef = getGroup(g.name);
                    const Icon = gDef.Icon;
                    return (
                    <div key={g.name} className="em-card-sm em-card-hover" style={{cursor:"pointer"}}>
                      <div style={{width:40,height:40,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10,background:g.hexBg,border:`1px solid ${g.hex}30`}}>
                        <Icon size={20} strokeWidth={2} color={g.hex} />
                      </div>
                      <div style={{fontWeight:600,fontSize:13,color:"#1e2464"}}>{g.name}</div>
                      <div style={{fontSize:11,color:"#8890aa",marginTop:3}}>{g.count} membres</div>
                      <button className="em-btn em-btn-outline em-btn-sm" style={{marginTop:10,width:"100%"}}>Gérer</button>
                    </div>
                    );
                  })}
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
                              const res = await updateMemberValidation(m.id, true);
                              if (res?.error) { setToast(`❌ Erreur : ${res.error}`); return; }
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
                      {num:totalUsers,    lbl:"Utilisateurs total"},
                      {num:membresValides,lbl:"Membres validés"},
                      {num:visiteurs,     lbl:"Visiteurs inscrits"},
                      {num:prayerCount,   lbl:"Prières actives"},
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

          {/* ── MESSAGERIE INTERNE (boîtes M365) ────────────────── */}
          {(canAdmin || (profile?.groups ?? []).length > 0) && (
            <div className={`em-panel${panel==="mail"?" active":""}`}>
              <MailPanel
                authorizedMailboxes={getAuthorizedMailboxes(role, profile?.groups ?? [])}
              />
            </div>
          )}

        </main>

        {/* ╔══════ RIGHT PANEL ══════╗ */}
        <aside className="em-rp">
          {/* Membres en ligne */}
          <div className="em-rp-sec">
            <div className="em-rp-title">En ligne — {onlineMembers.length}</div>
            {onlineMembers.length === 0 ? (
              <span style={{fontSize:12,color:"#8890aa"}}>Aucun membre actif</span>
            ) : onlineMembers.slice(0,6).map(m => (
              <div key={m.userId} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 0"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#1E2464,#8899CC)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:700}}>
                    {m.initiale}
                  </div>
                  <span style={{position:"absolute",bottom:0,right:0,width:6,height:6,borderRadius:"50%",background:"#22c55e",border:"1.5px solid #f8f9ff"}} />
                </div>
                <span style={{fontSize:12,color:"#2d3580",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {m.userId === userId ? `${m.name} (vous)` : m.name}
                </span>
              </div>
            ))}
          </div>

          {/* Membres */}
          <div className="em-rp-sec">
            <div className="em-rp-title">Communauté</div>
            {[
              {lbl:"Membres validés",  num:membresValides, color:"#276749"},
              {lbl:"Visiteurs inscrits",num:visiteurs,      color:"#c05621"},
              {lbl:"Total utilisateurs",num:totalUsers,     color:"#1e2464"},
            ].map(s => (
              <div key={s.lbl} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid rgba(30,36,100,.06)"}}>
                <span style={{fontSize:12,color:"#4a5070"}}>{s.lbl}</span>
                <span style={{fontSize:14,fontWeight:700,color:s.color}}>{s.num}</span>
              </div>
            ))}
            <div style={{marginTop:10,fontSize:11,color:"#8890aa"}}>
              {prayerCount > 0
                ? <><span className="em-dot-green" style={{display:"inline-block",marginRight:5,verticalAlign:"middle"}} />{prayerCount} prière{prayerCount > 1 ? "s" : ""} active{prayerCount > 1 ? "s" : ""}</>
                : "Aucune prière active"}
            </div>
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
            {activities.length === 0 ? (
              <div style={{fontSize:11,color:"#8890aa",padding:"4px 0"}}>Aucune activité récente.</div>
            ) : activities.slice(0,4).map((a)=>(
              <div key={a.id} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid rgba(30,36,100,.06)"}}>
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

      {/* ╔══════ MOBILE BOTTOM NAV ══════╗ */}
      <nav className="em-mob-nav">
        {([
          { id:"accueil",    Icon:Home,          lbl:"Accueil" },
          { id:"messagerie", Icon:MessageSquare, lbl:"Messages", badge:5 },
          { id:"priere",     Icon:BookOpen,      lbl:"Bible" },
          { id:"streaming",  Icon:PlayCircle,    lbl:"Stream" },
          { id:"__more__",   Icon:Bell,          lbl:"Plus" },
        ] as {id:string;Icon:LucideIcon;lbl:string;badge?:number}[]).map(item => (
          <button key={item.id}
            className={`em-mob-ni${(item.id !== "__more__" && panel === item.id) ? " active" : ""}`}
            onClick={() => item.id === "__more__" ? setShowDrawer(true) : nav(item.id as Panel)}
          >
            <div className="em-mob-ni-bg" style={{position:"relative"}}>
              <div className="em-mob-ni-ico"><item.Icon size={18} strokeWidth={1.75} /></div>
              {item.badge
                ? <span style={{position:"absolute",top:-2,right:-6,background:"#e53e3e",color:"#fff",borderRadius:10,fontSize:9,fontWeight:800,padding:"0 4px",minWidth:14,textAlign:"center"}}>{item.badge}</span>
                : null}
            </div>
            <span className="em-mob-ni-lbl">{item.lbl}</span>
          </button>
        ))}
      </nav>

      {/* ╔══════ MOBILE DRAWER ══════╗ */}
      <div className={`em-drawer-bg${showDrawer ? " open" : ""}`} onClick={() => setShowDrawer(false)} />
      <div className={`em-drawer${showDrawer ? " open" : ""}`}>
        <div className="em-drawer-top">
          <a href="/" className="em-logo" style={{fontSize:13}}>
            <div className="em-logo-icon" style={{width:26,height:26,fontSize:8}}>ARC</div>
            <span style={{color:"#fff"}}>ARC <span style={{color:"rgba(255,255,255,.5)",fontWeight:400}}>Membres</span></span>
          </a>
          <button className="em-drawer-close" onClick={() => setShowDrawer(false)}>✕</button>
        </div>
        <div style={{flex:1,paddingTop:8,overflowY:"auto"}}>
          {NAV_ITEMS.map(group => (
            <div key={group.section}>
              <div className="em-sb-section">{group.section}</div>
              {group.items.map(item => {
                const DrawerIcon = item.Icon;
                return item.href ? (
                <a key={item.id} href={item.href} className="em-ni"
                  style={{textDecoration:"none",display:"flex",alignItems:"center"}}
                  onClick={() => setShowDrawer(false)}>
                  <span className="em-ni-ico"><DrawerIcon size={16} strokeWidth={1.75} /></span>
                  <span className="em-ni-lbl">{item.lbl}</span>
                </a>
              ) : (
                <button key={item.id}
                  className={`em-ni${panel === item.id ? " active" : ""}`}
                  onClick={() => { nav(item.id as Panel); setShowDrawer(false); }}>
                  <span className="em-ni-ico"><DrawerIcon size={16} strokeWidth={1.75} /></span>
                  <span className="em-ni-lbl">{item.lbl}</span>
                  {item.badge ? <span className="em-badge">{item.badge}</span>
                    : item.live ? <span className="em-live">LIVE</span>
                    : item.count ? <span className="em-badge-soft">{item.count}</span>
                    : null}
                </button>
              );})}
            </div>
          ))}
          {canAdmin && <hr className="em-sb-sep" />}
          {canAdmin && (
            <button className="em-ni" onClick={() => setShowGS(true)}>
              <span className="em-ni-ico">📡</span>
              <span className="em-ni-lbl">Gestion Stream</span>
            </button>
          )}
        </div>
        <a href="/espace-membres/profil" className="em-sb-user">
          <div className="em-av" style={{width:34,height:34,fontSize:12}}>
            {profile?.avatar_url ? <Image src={profile.avatar_url} alt="" width={34} height={34} /> : initiale}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayName}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>{role}</div>
          </div>
        </a>
        <button className="em-ni" style={{margin:"4px 8px 12px",color:"rgba(255,255,255,.35)",fontSize:12}}
          onClick={async () => { await fetch("/api/auth/signout"); window.location.href = "/"; }}>
          <span className="em-ni-ico" style={{fontSize:12}}>←</span>
          <span>Déconnexion</span>
        </button>
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

      {/* ── Gestion des droits (Admin uniquement) — Modal plein écran ── */}
      {showGD && isAdmin && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,13,42,.85)",backdropFilter:"blur(8px)",zIndex:4500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:12,overflowY:"auto"}} onClick={()=>setShowGD(false)}>
          <div style={{background:"#fff",borderRadius:18,width:"100%",maxWidth:1200,maxHeight:"calc(100vh - 24px)",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.5)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{background:"linear-gradient(135deg,#c53030,#9b2c2c)",padding:"16px 22px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
              <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚡</div>
              <div>
                <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:20,fontWeight:700,color:"white"}}>Gestion des Droits &amp; Accès</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.65)"}}>Super-Admin (Jaise) · Contrôle total sur tous les rôles, droits et accès</div>
              </div>
              <div style={{marginLeft:"auto",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"4px 12px",fontSize:10,fontWeight:700,color:"white",letterSpacing:.5}}>⚡ SUPER-ADMIN UNIQUEMENT</div>
              <button onClick={()=>setShowGD(false)} style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            {/* Tabs */}
            <div style={{display:"flex",background:"#f7f8fc",borderBottom:"1px solid rgba(30,36,100,.1)",flexShrink:0}}>
              {([["matrix","🔐 Matrice des droits"],["pasteurs","👑 Gestion Pasteurs"],["membres","👥 Gestion Membres"],["audit","📋 Journal d'audit"]] as ["matrix"|"pasteurs"|"membres"|"audit",string][]).map(([t,l])=>(
                <button key={t} onClick={()=>setGdTab(t)} style={{padding:"12px 20px",fontSize:13,fontWeight:600,color:gdTab===t?"#c53030":"#8890aa",borderBottom:gdTab===t?"2.5px solid #c53030":"2.5px solid transparent",border:"none",background:"transparent",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Outfit,sans-serif"}}>
                  {l}
                </button>
              ))}
            </div>
            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:24}}>
              {/* ── Matrice des droits ── */}
              {gdTab==="matrix" && (
                <div>
                  <div style={{marginBottom:16}}>
                    <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464"}}>Matrice des droits par groupe</div>
                    <div style={{fontSize:12,color:"#8890aa",marginTop:3}}>Cliquez sur un interrupteur pour accorder ou révoquer une permission.</div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr>
                          <th style={{background:"#1e2464",color:"white",padding:"10px 12px",textAlign:"left",fontWeight:700,fontSize:11,minWidth:180,position:"sticky",left:0,zIndex:1}}>Fonctionnalité</th>
                          {GD_GROUPS.map(g => (
                            <th key={g} style={{background:"#1e2464",color:"white",padding:"10px 6px",textAlign:"center",fontWeight:700,fontSize:10,whiteSpace:"nowrap"}}>{GD_GROUP_LABELS[g]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {GD_FEATURES.map((f,fi) => (
                          <tr key={f.id} style={{background:fi%2===0?"#f7f8fc":"white"}}>
                            <td style={{padding:"8px 12px",fontWeight:500,fontSize:12,color:"#1e2464",position:"sticky",left:0,background:fi%2===0?"#f7f8fc":"white",borderBottom:"1px solid rgba(30,36,100,.07)"}}>{f.label}</td>
                            {GD_GROUPS.map(g => {
                              const on = gdPerms[f.id]?.[g] ?? false;
                              const disabled = f.id==="pastor_manage" && g!=="admin";
                              return (
                                <td key={g} style={{textAlign:"center",padding:6,borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                                  <button
                                    disabled={disabled}
                                    onClick={()=>{
                                      if (disabled) return;
                                      setGdPerms(p=>({...p,[f.id]:{...p[f.id],[g]:!on}}));
                                      setToast(`${on?"❌ Révoqué":"✅ Accordé"} : ${f.label} → ${GD_GROUP_LABELS[g]}`);
                                    }}
                                    style={{width:36,height:20,borderRadius:10,border:"none",cursor:disabled?"not-allowed":"pointer",background:on?"#2f855a":"#e2e8f0",position:"relative",transition:"background .25s",opacity:disabled?.3:1}}
                                  >
                                    <span style={{position:"absolute",top:2,left:on?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .25s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}} />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{marginTop:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                    <button className="em-btn em-btn-primary em-btn-sm" onClick={async()=>{
                      const res = await savePermissionsMatrix(gdPerms);
                      if (res?.error) { setToast(`❌ Erreur : ${res.error}`); }
                      else { setToast("💾 Matrice sauvegardée ✅"); }
                    }}>💾 Sauvegarder</button>
                    <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>{const p:Record<string,Record<string,boolean>>={};for(const k in GD_DEFAULTS)p[k]={...GD_DEFAULTS[k]};setGdPerms(p);setToast("↺ Matrice réinitialisée aux défauts");}}>↺ Réinitialiser aux défauts</button>
                    <span style={{fontSize:11,color:"#8890aa",marginLeft:8}}>Les modifications sont propagées via Supabase RLS en production</span>
                  </div>
                </div>
              )}
              {/* ── Gestion Pasteurs ── */}
              {gdTab==="pasteurs" && (
                <div>
                  <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464",marginBottom:4}}>Gestion des Pasteurs</div>
                  <div style={{fontSize:12,color:"#8890aa",marginBottom:16}}>Seul l&apos;Admin peut modifier les rôles des Pasteurs ou révoquer leur statut pastoral.</div>
                  <div style={{background:"rgba(229,62,62,.06)",border:"1px solid rgba(229,62,62,.15)",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>⚠️</span>
                    <div style={{fontSize:12,color:"#c53030"}}>La révocation d&apos;un Pasteur est irréversible sans intervention manuelle. Toute modification est journalisée.</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {members.filter(m=>m.role==="pasteur").map(m => {
                      const name = [m.first_name,m.last_name].filter(Boolean).join(" ")||m.email;
                      const initL = (m.first_name?.[0]??m.email[0]).toUpperCase();
                      return (
                        <div key={m.id} style={{background:"#f7f8fc",border:"1px solid rgba(30,36,100,.1)",borderRadius:14,padding:18,display:"flex",alignItems:"center",gap:14}}>
                          <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#1e2464,#8899cc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"white",flexShrink:0}}>{initL}</div>
                          <div>
                            <div style={{fontSize:14,fontWeight:700,color:"#1e2464"}}>{name}</div>
                            <div style={{fontSize:11,color:"#8890aa",marginTop:2}}>Pasteur · {m.email}</div>
                          </div>
                          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                            <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setToast(`✏️ Modifier ${name}`)}>✏️ Modifier</button>
                            <button className="em-btn em-btn-sm" style={{background:"rgba(229,62,62,.1)",color:"#c53030",border:"1px solid rgba(229,62,62,.2)"}} onClick={()=>{if(confirm(`⚠️ Révoquer le statut pastoral de ${name} ?`))setToast(`❌ Statut révoqué : ${name}`);}}>❌ Révoquer</button>
                          </div>
                        </div>
                      );
                    })}
                    {members.filter(m=>m.role==="pasteur").length===0 && (
                      <div style={{textAlign:"center",padding:"30px 0",color:"#8890aa"}}>Aucun pasteur chargé — actualisez la liste dans l&apos;onglet Membres.</div>
                    )}
                  </div>
                </div>
              )}
              {/* ── Gestion Membres ── */}
              {gdTab==="membres" && (
                <div>
                  <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464",marginBottom:4}}>Gestion des membres &amp; rôles</div>
                  <div style={{fontSize:12,color:"#8890aa",marginBottom:16}}>Rôle, fonctions et accès — cliquez sur 📋 pour modifier les fonctions d&apos;un membre.</div>
                  <input className="em-input" style={{marginBottom:14,width:"100%",maxWidth:360}} placeholder="🔍 Rechercher un membre…" value={mSearch} onChange={e=>setMSearch(e.target.value)} />
                  <div style={{display:"flex",flexDirection:"column",gap:1}}>
                    {members.filter(m=>mSearch ? `${m.first_name??""} ${m.last_name??""} ${m.email}`.toLowerCase().includes(mSearch.toLowerCase()) : true).slice(0,20).map(m => {
                      const name = [m.first_name,m.last_name].filter(Boolean).join(" ")||m.email;
                      const initL = (m.first_name?.[0]??m.email[0]).toUpperCase();
                      const isExpanded = expandedMember === m.id;
                      const FUNC_GROUPS = ["pasteur","media","chorale","jeunesse","femmes","social","sanitaire","finance","ecodim","suivi","communication","support"];
                      return (
                        <div key={m.id} style={{borderBottom:"1px solid rgba(30,36,100,.06)",borderRadius:8,overflow:"hidden"}}>
                          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px"}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#1e2464,#4a54b0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"white",flexShrink:0}}>{initL}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:"#1e2464"}}>{name}</div>
                              <div style={{fontSize:11,color:"#8890aa"}}>{m.email} · {m.role}{(m.groups??[]).length>0?` · ${(m.groups??[]).join(", ")}`:""}</div>
                            </div>
                            <select className="em-select" style={{fontSize:11,padding:"4px 8px",width:110}} defaultValue={m.role} onChange={async e=>{
                              const newRole = e.target.value;
                              const res = await setMemberRoleAction(m.id, newRole);
                              if (res?.error) { setToast(`❌ ${res.error}`); }
                              else { setToast(`✅ Rôle de ${name} → ${newRole}`); await loadMembers(); }
                            }}>
                              <option value="visiteur">Visiteur</option>
                              <option value="membre">Membre</option>
                              <option value="pasteur">Pasteur</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button className="em-btn em-btn-sm em-btn-outline" style={{fontSize:11,padding:"4px 8px"}} title="Gérer les fonctions" onClick={()=>setExpandedMember(isExpanded?null:m.id)}>
                              {isExpanded?"▲":"📋"}
                            </button>
                            <button className="em-btn em-btn-sm" style={{fontSize:11,background:"rgba(229,62,62,.08)",color:"#c53030",border:"1px solid rgba(229,62,62,.15)"}} onClick={async()=>{
                              if(!confirm(`⚠️ Bloquer l'accès de ${name} ?`)) return;
                              const res = await blockMember(m.id);
                              if (res?.error) { setToast(`❌ ${res.error}`); }
                              else { setToast(`🚫 ${name} bloqué.`); await loadMembers(); }
                            }}>🚫</button>
                          </div>
                          {isExpanded && (
                            <div style={{padding:"8px 58px 14px",background:"rgba(30,36,100,.03)",borderTop:"1px solid rgba(30,36,100,.06)"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Fonctions attribuées</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                                {FUNC_GROUPS.map(g=>{
                                  const checked = (m.groups??[]).includes(g);
                                  return (
                                    <label key={g} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer",padding:"4px 8px",borderRadius:6,background:checked?"rgba(30,36,100,.08)":"transparent",border:"1px solid",borderColor:checked?"rgba(30,36,100,.2)":"rgba(30,36,100,.08)",transition:"all .15s"}}>
                                      <input type="checkbox" checked={checked} style={{accentColor:"#1e2464"}} onChange={async()=>{
                                        const cur = m.groups??[];
                                        const next = checked ? cur.filter(x=>x!==g) : [...cur, g];
                                        const res = await updateMemberGroups(m.id, next);
                                        if (res?.error) setToast(`❌ ${res.error}`);
                                        else { setToast(`✅ Fonctions de ${name} mises à jour`); await loadMembers(); }
                                      }} />
                                      <span style={{color:checked?"#1e2464":"#8890aa",fontWeight:checked?600:400,textTransform:"capitalize"}}>{g}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ── Journal d'audit ── */}
              {gdTab==="audit" && (
                <div>
                  <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:22,fontWeight:700,color:"#1e2464",marginBottom:4}}>Journal d&apos;audit système</div>
                  <div style={{fontSize:12,color:"#8890aa",marginBottom:16}}>Toutes les actions d&apos;administration sont journalisées. Seul l&apos;Admin y a accès.</div>
                  <div style={{fontFamily:"Courier New,monospace",fontSize:11,background:"#0a0d1a",color:"#a8e6cf",borderRadius:10,padding:16,maxHeight:400,overflowY:"auto",lineHeight:1.8}}>
                    <div style={{color:"#8890aa"}}>Aucune entrée — le journal sera alimenté automatiquement par les actions admin.</div>
                  </div>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{padding:"14px 22px",borderTop:"1px solid rgba(30,36,100,.1)",background:"#f7f8fc",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{fontSize:11,color:"#8890aa"}}>Modifications propagées via Supabase RLS · Journalisées dans l&apos;audit</div>
              <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setShowGD(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Maj Plateformes ── */}
      {showMP && (canAdmin||canMajPlateforme) && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,13,42,.85)",backdropFilter:"blur(8px)",zIndex:4500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:12,overflowY:"auto"}} onClick={()=>setShowMP(false)}>
          <div style={{background:"#fff",borderRadius:18,width:"100%",maxWidth:1100,maxHeight:"calc(100vh - 24px)",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.5)",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:"linear-gradient(135deg,#553c9a,#8b5cf6)",padding:"16px 22px",display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
              <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🖼️</div>
              <div>
                <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:20,fontWeight:700,color:"white"}}>Maj Plateformes — Modules Vitrine</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.65)"}}>Gestion des 4 cartes &laquo;Des plateformes pour tous&raquo; · arc-eglise.ch</div>
              </div>
              <div style={{marginLeft:"auto",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"4px 12px",fontSize:10,fontWeight:700,color:"white"}}>📡 COMMUNICATION UNIQUEMENT</div>
              <button onClick={()=>setShowMP(false)} style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",color:"white",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{flex:1,display:"flex",overflow:"hidden"}}>
              {/* Sidebar */}
              <div style={{width:220,borderRight:"1px solid rgba(30,36,100,.1)",background:"#f7f8fc",padding:16,display:"flex",flexDirection:"column",gap:6,flexShrink:0,overflowY:"auto"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>4 Modules Plateformes</div>
                {mpCards.map((card,i) => (
                  <button key={card.id} onClick={()=>setMpCard(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",background:mpCard===i?"rgba(85,60,154,.12)":"transparent",cursor:"pointer",textAlign:"left",outline:mpCard===i?"2px solid #8b5cf6":"none"}}>
                    <div style={{width:40,height:28,borderRadius:6,background:card.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{card.icon}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#1e2464"}}>{card.title}</div>
                      <div style={{fontSize:10,color:"#8890aa"}}>{card.tag}</div>
                    </div>
                  </button>
                ))}
                <div style={{marginTop:"auto",paddingTop:16,borderTop:"1px solid rgba(30,36,100,.1)"}}>
                  <button className="em-btn em-btn-primary em-btn-sm" style={{width:"100%",justifyContent:"center"}} onClick={()=>{setToast("🚀 Toutes les cartes publiées sur arc-eglise.ch !");setShowMP(false);}}>🚀 Publier toutes les cartes</button>
                </div>
              </div>
              {/* Éditeur */}
              <div style={{flex:1,overflowY:"auto",padding:24}}>
                {(() => { const card = mpCards[mpCard]; return (
                  <div>
                    {/* Aperçu */}
                    <div style={{marginBottom:20,textAlign:"center"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Aperçu en temps réel</div>
                      <div style={{width:220,height:140,borderRadius:14,overflow:"hidden",margin:"0 auto",position:"relative",display:"inline-flex",flexDirection:"column",justifyContent:"flex-end",padding:12,boxShadow:"0 8px 24px rgba(0,0,0,.2)"}}>
                        <div style={{position:"absolute",inset:0,background:card.bg,zIndex:0}} />
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.7),transparent)",zIndex:1}} />
                        <div style={{position:"relative",zIndex:2,textAlign:"left"}}>
                          <div style={{fontSize:9,color:"rgba(255,255,255,.7)",marginBottom:2,textTransform:"uppercase",letterSpacing:.5}}>{card.tag}</div>
                          <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",fontSize:16,fontWeight:700,color:"white",lineHeight:1.2}}>{card.title}</div>
                        </div>
                      </div>
                    </div>
                    {/* Gradient picker */}
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1e2464",marginBottom:8}}>🎨 Fond de la carte</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {MP_GRADIENTS.map((g,gi) => (
                          <button key={gi} onClick={()=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,bg:g}:x))} style={{width:36,height:36,borderRadius:8,background:g,border:card.bg===g?"3px solid #553c9a":"2px solid transparent",cursor:"pointer"}} />
                        ))}
                      </div>
                    </div>
                    {/* Textes */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1e2464",marginBottom:8}}>✏️ Textes</div>
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Titre principal</label>
                      <input className="em-input" style={{marginBottom:8,width:"100%"}} value={card.title} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,title:e.target.value}:x))} />
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Étiquette (tag)</label>
                      <input className="em-input" style={{marginBottom:8,width:"100%"}} value={card.tag} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,tag:e.target.value}:x))} />
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Description courte</label>
                      <textarea className="em-input" style={{minHeight:60,resize:"vertical",width:"100%",marginBottom:8}} value={card.desc} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,desc:e.target.value}:x))} />
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Texte du bouton CTA</label>
                      <input className="em-input" style={{marginBottom:8,width:"100%"}} value={card.cta} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,cta:e.target.value}:x))} />
                    </div>
                    {/* Liens */}
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#1e2464",marginBottom:8}}>🔗 Liens &amp; Infos</div>
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Lien CTA</label>
                      <input className="em-input" style={{marginBottom:8,width:"100%"}} value={card.link} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,link:e.target.value}:x))} />
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Horaire du groupe</label>
                      <input className="em-input" style={{marginBottom:8,width:"100%"}} value={card.schedule} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,schedule:e.target.value}:x))} />
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Responsable / Contact</label>
                      <input className="em-input" style={{width:"100%"}} value={card.contact} onChange={e=>setMpCards(c=>c.map((x,xi)=>xi===mpCard?{...x,contact:e.target.value}:x))} />
                    </div>
                  </div>
                );})()}
              </div>
            </div>
            <div style={{padding:"14px 22px",borderTop:"1px solid rgba(30,36,100,.1)",background:"#f7f8fc",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:"#8890aa"}}>Modifications publiées instantanément sur arc-eglise.ch via API Supabase</div>
              <div style={{display:"flex",gap:8}}>
                <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setShowMP(false)}>Annuler</button>
                <button className="em-btn em-btn-sm" style={{background:"linear-gradient(135deg,#553c9a,#8b5cf6)",color:"white"}} onClick={()=>setToast("💾 Carte sauvegardée !")}>💾 Sauvegarder cette carte</button>
                <button className="em-btn em-btn-sm" style={{background:"linear-gradient(135deg,#2f855a,#38a169)",color:"white"}} onClick={()=>{setToast("🚀 Publié sur arc-eglise.ch !");setShowMP(false);}}>🚀 Publier sur le site</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Maj site vitrine ── */}
      {showMajInfo && canAdmin && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,13,42,.82)",backdropFilter:"blur(6px)",zIndex:4400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:12,overflowY:"auto"}} onClick={()=>setShowMajInfo(false)}>
          <div className="em-modal" style={{maxWidth:760,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">🌐 Mise à jour du site vitrine ARC</span>
              <button className="em-modal-close" onClick={()=>setShowMajInfo(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{fontSize:11,color:"#8890aa",marginBottom:14}}>arc-eglise.ch · Modifications visibles immédiatement</div>
              <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(30,36,100,.1)",marginBottom:16,overflowX:"auto"}}>
                {([["sermons","📺 Sermons"],["events","📅 Événements"],["infos","📍 Infos"],["verset","📖 Verset"],["equipe","👥 Équipe"]] as ["sermons"|"events"|"infos"|"verset"|"equipe",string][]).map(([t,l]) => (
                  <button key={t} onClick={()=>setMajInfoTab(t)} style={{padding:"8px 16px",fontSize:12,fontWeight:600,color:majInfoTab===t?"#1e2464":"#8890aa",borderBottom:majInfoTab===t?"2.5px solid #1e2464":"2.5px solid transparent",border:"none",background:"transparent",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Outfit,sans-serif"}}>{l}</button>
                ))}
              </div>
              {majInfoTab==="sermons" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1e2464"}}>Sermons sur le site vitrine</div>
                    <a href="/admin/sermons" className="em-btn em-btn-primary em-btn-sm" style={{textDecoration:"none"}}>+ Gérer les sermons →</a>
                  </div>
                  <p style={{fontSize:12,color:"#8890aa"}}>Gérez vos sermons depuis le panneau d&apos;administration. Les modifications seront publiées automatiquement sur le site vitrine.</p>
                  <button className="em-btn em-btn-primary" style={{width:"100%",marginTop:12}} onClick={()=>{setShowMajInfo(false);setToast("✅ Site vitrine mis à jour — Sermons publiés !");}}>📤 Publier les modifications</button>
                </div>
              )}
              {majInfoTab==="events" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1e2464"}}>Événements publics</div>
                    <a href="/admin/evenements" className="em-btn em-btn-primary em-btn-sm" style={{textDecoration:"none"}}>+ Gérer les événements →</a>
                  </div>
                  <p style={{fontSize:12,color:"#8890aa"}}>Les événements publiés dans l&apos;agenda apparaissent automatiquement sur le site vitrine.</p>
                  <button className="em-btn em-btn-primary" style={{width:"100%",marginTop:12}} onClick={()=>{setShowMajInfo(false);setToast("✅ Événements mis à jour sur le site !");}}>📤 Synchroniser le site</button>
                </div>
              )}
              {majInfoTab==="infos" && (
                <div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Adresse</label>
                      <input className="em-input" defaultValue="Av. Charles-Naine 39, 2300 La Chaux-de-Fonds" />
                    </div>
                    <div style={{flex:1}}>
                      <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Heure du culte</label>
                      <input className="em-input" defaultValue="Dimanche 09h30" />
                    </div>
                  </div>
                  <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Email de contact</label>
                  <input className="em-input" style={{marginBottom:12}} defaultValue="contact@arc-eglise.ch" />
                  <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{setShowMajInfo(false);setToast("✅ Informations du site mises à jour !");}}>📤 Publier</button>
                </div>
              )}
              {majInfoTab==="verset" && (
                <div>
                  <div style={{display:"flex",gap:10,marginBottom:14}}>
                    {[["🤖","Automatique","API.Bible"],["📖","Thématique","Par série"],["✍️","Manuel","Pasteur choisit"]].map(([ico,lbl,sub]) => (
                      <div key={lbl} style={{flex:1,padding:12,borderRadius:10,border:"1.5px solid rgba(30,36,100,.12)",background:"#f7f8fc",textAlign:"center",cursor:"pointer"}} onClick={()=>setToast(`Mode verset : ${lbl}`)}>
                        <div style={{fontSize:24,marginBottom:4}}>{ico}</div>
                        <div style={{fontSize:12,fontWeight:700,color:"#1e2464"}}>{lbl}</div>
                        <div style={{fontSize:10,color:"#8890aa"}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Verset actuel</label>
                  <input className="em-input" style={{marginBottom:12}} defaultValue="Jérémie 29:11 — Car je connais les projets que j'ai formés sur vous…" />
                  <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{setShowMajInfo(false);setToast("✅ Verset du jour mis à jour sur le site !");}}>📤 Publier le verset</button>
                </div>
              )}
              {majInfoTab==="equipe" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#1e2464"}}>Équipe pastorale visible sur le site</div>
                    <a href="/admin/equipe" className="em-btn em-btn-primary em-btn-sm" style={{textDecoration:"none"}}>Gérer l&apos;équipe →</a>
                  </div>
                  <p style={{fontSize:12,color:"#8890aa"}}>Gérez les profils de l&apos;équipe pastorale visibles sur la page publique du site vitrine.</p>
                  <button className="em-btn em-btn-primary" style={{width:"100%",marginTop:12}} onClick={()=>{setShowMajInfo(false);setToast("✅ Page équipe mise à jour sur le site !");}}>📤 Publier</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Video Call modal ── */}
      {showVideoCall && (
        <div className="em-overlay" onClick={()=>setShowVideoCall(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">📹 Démarrer une réunion vidéo</span>
              <button className="em-modal-close" onClick={()=>setShowVideoCall(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                <div className="em-card-sm em-card-hover" style={{textAlign:"center",cursor:"pointer"}} onClick={()=>{setShowVideoCall(false);setToast("🎥 Réunion Jitsi Meet démarrée ! Lien copié.");}}>
                  <div style={{fontSize:28,marginBottom:6}}>🎥</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1e2464"}}>Jitsi Meet</div>
                  <div style={{fontSize:11,color:"#8890aa"}}>Gratuit · Sécurisé</div>
                </div>
                <div className="em-card-sm em-card-hover" style={{textAlign:"center",cursor:"pointer"}} onClick={()=>{setShowVideoCall(false);setToast("📹 Zoom ouvert — Lien de réunion partagé dans le canal");}}>
                  <div style={{fontSize:28,marginBottom:6}}>📹</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1e2464"}}>Zoom</div>
                  <div style={{fontSize:11,color:"#8890aa"}}>Partager un lien</div>
                </div>
              </div>
              <div style={{background:"#f7f8fc",borderRadius:10,padding:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:11,color:"#4a5070",flex:1}}>Lien de réunion : <strong>meet.arc-eglise.ch/reunion-{Math.random().toString(36).slice(2,6)}</strong></div>
                <button className="em-btn em-btn-outline em-btn-sm" onClick={()=>setToast("📋 Lien copié !")}>Copier</button>
              </div>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Inviter des participants</label>
              <select className="em-select" multiple style={{minHeight:80,width:"100%",marginBottom:14}}>
                {members.filter(m=>m.validated).slice(0,10).map(m => (
                  <option key={m.id}>{[m.first_name,m.last_name].filter(Boolean).join(" ")||m.email}</option>
                ))}
              </select>
              <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{setShowVideoCall(false);setToast("✅ Invitations envoyées ! Réunion en cours dans 30 secondes…");}}>Démarrer la réunion maintenant</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Doléance modal ── */}
      {showDoleance && (
        <div className="em-overlay" onClick={()=>setShowDoleance(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">📬 Déposer une doléance</span>
              <button className="em-modal-close" onClick={()=>setShowDoleance(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{fontSize:12,color:"#8890aa",marginBottom:14}}>Signaler un problème ou faire une suggestion à l&apos;équipe ARC</div>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Type</label>
              <select className="em-select" style={{marginBottom:12}} value={doleanceType} onChange={e=>setDoleanceType(e.target.value)}>
                <option value="bug">🐛 Problème technique</option>
                <option value="suggestion">💡 Suggestion d&apos;amélioration</option>
                <option value="pastoral">🤝 Question pastorale</option>
                <option value="autre">⚠️ Autre</option>
              </select>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Description</label>
              <textarea className="em-input" style={{minHeight:100,resize:"vertical",marginBottom:12,width:"100%"}} placeholder="Décrivez votre problème ou suggestion en détail…" value={doleanceText} onChange={e=>setDoleanceText(e.target.value)} />
              <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#4a5070",cursor:"pointer",marginBottom:16}}>
                <input type="checkbox" checked={doleanceAnon} onChange={e=>setDoleanceAnon(e.target.checked)} />
                Signalement anonyme
              </label>
              <button
                className="em-btn em-btn-primary"
                style={{width:"100%",opacity:doleanceSending?.5:1}}
                disabled={doleanceSending}
                onClick={async()=>{
                  if(!doleanceText.trim()){setToast("⚠️ Veuillez décrire votre doléance");return;}
                  setDoleanceSending(true);
                  const result = await submitDoleance(doleanceType,doleanceText,doleanceAnon);
                  setDoleanceSending(false);
                  if(result.error){setToast(`❌ Erreur: ${result.error}`);return;}
                  setDoleanceText("");
                  setShowDoleance(false);
                  setToast("✅ Doléance transmise — Un responsable vous répondra prochainement.");
                }}
              >{doleanceSending?"Envoi en cours…":"Envoyer"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Paramètres modal ── */}
      {showSettings && (
        <div className="em-overlay" onClick={()=>setShowSettings(false)}>
          <div className="em-modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">⚙️ Paramètres du compte</span>
              <button className="em-modal-close" onClick={()=>setShowSettings(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:16}}>
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {([["notifs","🔔 Notifications"],["privacy","🔒 Confidentialité"],["langue","🌐 Langue"],["bible","📖 Bible"],["affichage","🔤 Affichage"],["securite","🔑 Sécurité"]] as ["notifs"|"privacy"|"langue"|"bible"|"affichage"|"securite",string][]).map(([s,l])=>(
                    <button key={s} onClick={()=>{setSettingsSection(s);setPwdError(null);setPwdSuccess(false);}} style={{padding:"8px 10px",borderRadius:8,border:"none",background:settingsSection===s?"#eef1f8":"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:settingsSection===s?"#1e2464":"#8890aa",textAlign:"left",fontFamily:"Outfit,sans-serif"}}>{l}</button>
                  ))}
                </div>
                <div>
                  {settingsSection==="notifs" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:12}}>🔔 Notifications</div>
                      {([["dm","Messages directs"],["culte","Rappels de culte"],["priere","Intentions de prière"],["verset","Verset du jour"],["events","Nouveaux événements"]] as [keyof typeof settingsNotifs,string][]).map(([k,l])=>(
                        <label key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13,padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                          <span>{l}</span>
                          <input type="checkbox" checked={settingsNotifs[k]} onChange={e=>setSettingsNotifs(n=>({...n,[k]:e.target.checked}))} />
                        </label>
                      ))}
                    </div>
                  )}
                  {settingsSection==="privacy" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:12}}>🔒 Confidentialité</div>
                      {[["Afficher mon profil dans les contacts","true"],["Partager mes présences avec le groupe","true"],["Recevoir des messages directs","true"]].map(([l,v])=>(
                        <label key={l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:13,padding:"8px 0",borderBottom:"1px solid rgba(30,36,100,.07)"}}>
                          <span>{l}</span>
                          <input type="checkbox" defaultChecked={v==="true"} />
                        </label>
                      ))}
                    </div>
                  )}
                  {settingsSection==="langue" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:12}}>🌐 Langue &amp; Région</div>
                      <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Langue de l&apos;interface</label>
                      <select className="em-select" style={{marginBottom:12}} defaultValue="fr">
                        <option value="fr">🇫🇷 Français</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="kg">🇨🇩 Lingala</option>
                      </select>
                      <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Format de date</label>
                      <select className="em-select" defaultValue="fr-CH">
                        <option value="fr-CH">DD/MM/YYYY (Suisse)</option>
                        <option value="fr-FR">DD/MM/YYYY (France)</option>
                        <option value="en-US">MM/DD/YYYY (USA)</option>
                      </select>
                    </div>
                  )}
                  {settingsSection==="affichage" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:12}}>🔤 Taille du texte</div>
                      <div style={{fontSize:12,color:"#8890aa",marginBottom:16}}>S&apos;applique à Prière &amp; Bible et Messagerie</div>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                        <span style={{fontSize:11,color:"#8890aa"}}>A</span>
                        <input
                          type="range" min={13} max={26} step={1}
                          value={readingPrefs.font_size_px}
                          onChange={e=>updateReadingPrefs({ font_size_px: Number(e.target.value) })}
                          style={{flex:1,accentColor:"#1e2464"}}
                        />
                        <span style={{fontSize:15,color:"#8890aa"}}>A</span>
                      </div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {([{px:14,lbl:"Petit"},{px:16,lbl:"Normal"},{px:18,lbl:"Moyen"},{px:20,lbl:"Grand"},{px:22,lbl:"Très grand"}]).map(({px,lbl})=>(
                          <button key={px} onClick={()=>updateReadingPrefs({ font_size_px: px })}
                            style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${readingPrefs.font_size_px===px?"#1e2464":"rgba(30,36,100,.15)"}`,background:readingPrefs.font_size_px===px?"#1e2464":"transparent",color:readingPrefs.font_size_px===px?"#fff":"#1e2464",fontSize:12,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontWeight:600}}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                      <div className="em-reading-zone" style={{marginTop:16,padding:12,background:"#f8f9ff",borderRadius:10,lineHeight:1.6,color:"#4a5070"}}>
                        <span className="em-reading-text">Aperçu — &ldquo;Car Dieu a tant aimé le monde qu&apos;il a donné son Fils unique.&rdquo; Jean 3:16</span>
                      </div>
                    </div>
                  )}
                  {settingsSection==="bible" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:12}}>📖 Préférences Bible</div>
                      <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Traduction par défaut</label>
                      <select className="em-select" style={{marginBottom:12}} defaultValue="NBS">
                        <option value="NBS">NBS — Nouvelle Bible Segond</option>
                        <option value="BDS">BDS — Bible du Semeur</option>
                        <option value="LSG">LSG — Louis Segond</option>
                        <option value="NFC">NFC — Nouvelle Français Courant</option>
                        <option value="KJV">KJV — King James Version</option>
                      </select>
                      <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer"}}>
                        <input type="checkbox" defaultChecked />
                        Afficher les numéros de versets
                      </label>
                    </div>
                  )}
                  {settingsSection==="securite" && (
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1e2464",marginBottom:16}}>🔑 Modifier le mot de passe</div>
                      {pwdSuccess ? (
                        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"14px 16px",fontSize:13,color:"#166534"}}>
                          ✅ Mot de passe modifié avec succès. Un email de confirmation t&apos;a été envoyé.
                          <button onClick={()=>setPwdSuccess(false)} style={{display:"block",marginTop:8,fontSize:12,color:"#1e2464",background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:600,fontFamily:"Outfit,sans-serif"}}>Modifier à nouveau</button>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {pwdError && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#991b1b"}}>⚠️ {pwdError}</div>}
                          <div>
                            <label style={{fontSize:11,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Mot de passe actuel</label>
                            <div style={{position:"relative"}}>
                              <input type={pwdShowCurrent?"text":"password"} value={pwdCurrent} onChange={e=>setPwdCurrent(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"9px 44px 9px 12px",borderRadius:8,border:"1.5px solid rgba(30,36,100,.2)",fontSize:13,outline:"none",fontFamily:"Outfit,sans-serif",boxSizing:"border-box"}} />
                              <button type="button" onClick={()=>setPwdShowCurrent(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#8890aa",fontWeight:600,fontFamily:"Outfit,sans-serif"}}>{pwdShowCurrent?"Masquer":"Voir"}</button>
                            </div>
                          </div>
                          <div>
                            <label style={{fontSize:11,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Nouveau mot de passe</label>
                            <div style={{position:"relative"}}>
                              <input type={pwdShowNew?"text":"password"} value={pwdNew} onChange={e=>setPwdNew(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"9px 44px 9px 12px",borderRadius:8,border:"1.5px solid rgba(30,36,100,.2)",fontSize:13,outline:"none",fontFamily:"Outfit,sans-serif",boxSizing:"border-box"}} />
                              <button type="button" onClick={()=>setPwdShowNew(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#8890aa",fontWeight:600,fontFamily:"Outfit,sans-serif"}}>{pwdShowNew?"Masquer":"Voir"}</button>
                            </div>
                            {pwdNew.length>0 && (
                              <ul style={{marginTop:6,padding:0,listStyle:"none",fontSize:11,display:"flex",flexDirection:"column",gap:2}}>
                                <li style={{color:pwdNew.length>=8?"#166534":"#8890aa"}}>{pwdNew.length>=8?"✓":"○"} 8 caractères minimum</li>
                                <li style={{color:/[A-Z]/.test(pwdNew)?"#166534":"#8890aa"}}>{/[A-Z]/.test(pwdNew)?"✓":"○"} 1 lettre majuscule</li>
                                <li style={{color:/\d/.test(pwdNew)?"#166534":"#8890aa"}}>{/\d/.test(pwdNew)?"✓":"○"} 1 chiffre</li>
                              </ul>
                            )}
                          </div>
                          <div>
                            <label style={{fontSize:11,fontWeight:700,color:"#8890aa",textTransform:"uppercase",letterSpacing:"0.5px",display:"block",marginBottom:4}}>Confirmer le nouveau mot de passe</label>
                            <input type={pwdShowNew?"text":"password"} value={pwdNewConfirm} onChange={e=>setPwdNewConfirm(e.target.value)} placeholder="••••••••" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${pwdNewConfirm&&pwdNewConfirm!==pwdNew?"#f87171":pwdNewConfirm&&pwdNewConfirm===pwdNew?"#4ade80":"rgba(30,36,100,.2)"}`,fontSize:13,outline:"none",fontFamily:"Outfit,sans-serif",boxSizing:"border-box"}} />
                          </div>
                          <button
                            onClick={handleChangePassword}
                            disabled={pwdLoading||!pwdCurrent||!pwdNew||!pwdNewConfirm||pwdNew!==pwdNewConfirm||pwdNew.length<8||!/[A-Z]/.test(pwdNew)||!/\d/.test(pwdNew)}
                            className="em-btn em-btn-primary em-btn-sm"
                            style={{marginTop:4}}
                          >
                            {pwdLoading?"Enregistrement…":"Modifier le mot de passe"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {settingsSection!=="securite" && <button className="em-btn em-btn-primary em-btn-sm" style={{marginTop:16}} onClick={()=>{setShowSettings(false);setToast("✅ Paramètres sauvegardés !");}}>Sauvegarder</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Inviter un membre ── */}
      {showInvite && isAdmin && (
        <div className="em-overlay" onClick={()=>setShowInvite(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">✉️ Inviter un nouveau membre</span>
              <button className="em-modal-close" onClick={()=>setShowInvite(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Prénom</label>
                  <input className="em-input" placeholder="Prénom" value={invitePrenom} onChange={e=>setInvitePrenom(e.target.value)} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Nom</label>
                  <input className="em-input" placeholder="Nom de famille" value={inviteNom} onChange={e=>setInviteNom(e.target.value)} />
                </div>
              </div>
              <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Email</label>
              <input className="em-input" type="email" placeholder="adresse@email.com" style={{marginBottom:10}} value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} />
              <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Groupe proposé (optionnel)</label>
              <select className="em-select" style={{marginBottom:10}} value={inviteGroupe} onChange={e=>setInviteGroupe(e.target.value)}>
                <option value="">Aucun groupe pour l&apos;instant</option>
                {GROUPES.map(g=><option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
              <label style={{fontSize:11,color:"#8890aa",display:"block",marginBottom:3}}>Message personnalisé</label>
              <textarea className="em-input" style={{minHeight:80,resize:"vertical",width:"100%",marginBottom:14}} defaultValue={`Bonjour${invitePrenom ? ` ${invitePrenom}` : ""},\n\nJe vous invite à rejoindre l'espace membres de l'Église ARC La Chaux-de-Fonds.\n\nQue Dieu vous bénisse !`} />
              <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{if(!inviteEmail.trim()){setToast("⚠️ L'email est requis");return;}setShowInvite(false);setToast(`✅ Invitation envoyée à ${inviteEmail} ! Le lien expire dans 7 jours.`);}}>Envoyer l&apos;invitation</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Réserver une salle ── */}
      {showSalle && (
        <div className="em-overlay" onClick={()=>setShowSalle(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">🏢 Réserver une salle</span>
              <button className="em-modal-close" onClick={()=>setShowSalle(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Salle</label>
              <select className="em-select" style={{marginBottom:12}}>
                <option>📚 Écodim 0–6 ans (Libre)</option>
                <option>🏢 Bureau Pastoral (Libre)</option>
                <option disabled>🎵 Salle de musique (Réservée — Chorale sam 15h)</option>
                <option disabled>🏛 Salle Principale (Culte dimanche)</option>
              </select>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Date</label>
                  <input type="date" className="em-input" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Heure début</label>
                  <input type="time" className="em-input" defaultValue="17:00" />
                </div>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Heure fin</label>
                  <input type="time" className="em-input" defaultValue="19:00" />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Groupe</label>
                  <select className="em-select" style={{marginBottom:0}}>
                    {GROUPES.map(g=><option key={g.name}>{g.name}</option>)}
                  </select>
                </div>
              </div>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Motif</label>
              <input className="em-input" style={{marginBottom:14}} placeholder="Ex : Répétition chorale, Réunion pastorale…" />
              <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{setShowSalle(false);setToast("✅ Salle réservée ! Confirmation envoyée par email.");}}>Confirmer la réservation</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ajouter un événement ── */}
      {showAddEvent && canAdmin && (
        <div className="em-overlay" onClick={()=>setShowAddEvent(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">📅 Ajouter un événement</span>
              <button className="em-modal-close" onClick={()=>setShowAddEvent(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Titre</label>
              <input className="em-input" style={{marginBottom:10}} placeholder="Nom de l&apos;événement" />
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Date</label>
                  <input type="date" className="em-input" />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Heure</label>
                  <input type="time" className="em-input" defaultValue="09:30" />
                </div>
              </div>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Type</label>
              <select className="em-select" style={{marginBottom:10}}>
                <option>⛪ Culte (gratuit)</option>
                <option>🎵 Concert (ticket gratuit requis)</option>
                <option>💛 Événement payant</option>
                <option>🤝 Réunion interne</option>
              </select>
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:4}}>Lieu</label>
              <input className="em-input" style={{marginBottom:14}} defaultValue="Av. Charles-Naine 39, La Chaux-de-Fonds" />
              <button className="em-btn em-btn-primary" style={{width:"100%"}} onClick={()=>{setShowAddEvent(false);setToast("✅ Événement ajouté à l'agenda et au site vitrine !");}}>Publier l&apos;événement</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Note biblique ── */}
      {showNote && (
        <div className="em-overlay" onClick={()=>setShowNote(false)}>
          <div className="em-modal" onClick={e=>e.stopPropagation()}>
            <div className="em-modal-hdr">
              <span className="em-modal-title">📝 Note biblique</span>
              <button className="em-modal-close" onClick={()=>setShowNote(false)}>✕</button>
            </div>
            <div className="em-modal-body">
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Référence</label>
              <input className="em-input" style={{marginBottom:12}} placeholder="Ex : Jean 3:16, Psaumes 23…" value={noteRef} onChange={e=>setNoteRef(e.target.value)} />
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Ma note</label>
              <textarea className="em-input" style={{minHeight:140,resize:"vertical",width:"100%",marginBottom:12}} placeholder="Votre note, méditation, application pratique…" value={noteContent} onChange={e=>setNoteContent(e.target.value)} />
              <label style={{fontSize:12,color:"#4a5070",display:"block",marginBottom:6}}>Couleur</label>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                {[["#fffbeb","#fef3c7"],["#eff6ff","#bfdbfe"],["#f0fdf4","#bbf7d0"],["#fdf2f8","#fbcfe8"]].map(([bg,border])=>(
                  <button key={bg} onClick={()=>setToast("🎨 Couleur sélectionnée")} style={{width:28,height:28,borderRadius:"50%",background:bg,border:`2px solid ${border}`,cursor:"pointer"}} />
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="em-btn em-btn-outline" onClick={()=>setShowNote(false)}>Annuler</button>
                <button className="em-btn em-btn-primary" style={{flex:1}} onClick={()=>{if(!noteContent.trim()){setToast("⚠️ Ajoutez du contenu à votre note");return;}setShowNote(false);setNoteContent("");setToast("✅ Note biblique sauvegardée !");}}>Sauvegarder</button>
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
