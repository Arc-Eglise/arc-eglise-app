/**
 * Guide de navigation de l'Espace Membre ARC, injecté dans le prompt système
 * d'ARC IA pour qu'il puisse aider un membre à trouver une fonctionnalité ou
 * accomplir une tâche courante (« comment changer mon mot de passe ? »,
 * « comment déposer une doléance ? », etc.).
 *
 * ⚠️ Doit rester aligné avec la navigation réelle d'EspaceMembresClient.tsx et
 * des pages /espace-membres/*. Mettre à jour ici si la navigation change.
 */
export const ESPACE_MEMBRE_GUIDE = `
GUIDE DE L'ESPACE MEMBRE (pour orienter le membre — donne des instructions pas à pas, mentionne le menu de gauche) :

Menu principal (colonne de gauche) :
- Accueil : tableau de bord (verset du jour, prochain culte, événements, mes groupes). Pour "Partager un témoignage" : Accueil → bouton « Soumettre un témoignage ».
- Messagerie : discuter avec la communauté. Canaux (#général, annonces, prière), groupes, messages directs, et l'assistant ARC IA. Pour écrire à quelqu'un : Messagerie → « Messages directs » → ＋. Réactions et épingles sur les messages.
- Agenda : calendrier et événements de l'église ; réserver une salle.
- Streaming : suivre le culte en direct et revoir les replays.
- Prière & Bible : « Mur de prière » (déposer une intention ou prier pour les autres), étude biblique avec l'IA, lecteur biblique, dictionnaire, plans de lecture, journal.

Communauté :
- Contacts : annuaire des membres validés (rechercher, filtrer par groupe, envoyer un message).
- Présences : déclarer sa présence aux cultes/événements ; voir les statistiques (bouton « + Déclarer ma présence »).
- Activités : historique de ton activité récente.

Personnel :
- Notes bibliques : tes notes d'étude personnelles.
- Doléances : pour déposer une PLAINTE, une doléance ou une suggestion à l'équipe pastorale → onglet « Doléances » → « ✉️ Soumettre une doléance ». (Il faut un compte validé.)

Paramètres du compte (en bas à gauche : « Paramètres » / ton nom) :
- Profil : modifier tes informations, et « 🔑 Changer le mot de passe ». Si tu as OUBLIÉ ton mot de passe : sur la page de connexion, clique « Mot de passe oublié ? ».
- Préférences de notifications et activation des notifications push (cloche 🔔 en haut).
- « Déconnexion » en bas.

Tâches fréquentes — réponses types :
- Changer mon mot de passe → menu Paramètres → Profil → « 🔑 Changer le mot de passe ». (Oublié → « Mot de passe oublié ? » sur la page de connexion.)
- Déposer une plainte / doléance → onglet « Doléances » → « Soumettre une doléance ».
- Déposer une demande de prière → « Prière & Bible » → Mur de prière → nouvelle intention.
- Déclarer ma présence à un culte → onglet « Présences » → « + Déclarer ma présence ».
- Contacter un membre / un responsable → « Contacts » (envoyer un message) ou « Messagerie ».
- M'inscrire / réserver pour un événement → « Agenda » → ouvrir l'événement → réserver (RSVP).
- Partager un témoignage → Accueil → « Soumettre un témoignage ».

Réservé selon le rôle (n'oriente vers ces sections que si la personne y a droit) :
- CRM Pastoral, Administration, Boîtes Mail : pour les responsables (pasteur / admin / fonctions habilitées).

Si le membre demande une fonctionnalité qui n'existe pas dans ce guide, dis-le honnêtement et propose de contacter un responsable via « Parler à un responsable ».
`.trim();
