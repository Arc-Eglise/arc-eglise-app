export const DAILY_VERSES = [
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

export function getAutoVerset(interval: "24" | "48" = "24") {
  const now = new Date();
  const doy = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const idx = interval === "48"
    ? Math.floor(doy / 2) % DAILY_VERSES.length
    : doy % DAILY_VERSES.length;
  return DAILY_VERSES[idx];
}
