-- Dictionnaire théologique ARC Église
CREATE TABLE IF NOT EXISTS theological_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_def TEXT NOT NULL,
  definition TEXT NOT NULL,
  extended TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  key_verses JSONB NOT NULL DEFAULT '[]',
  related_terms TEXT[] NOT NULL DEFAULT '{}',
  tradition TEXT DEFAULT 'évangélique-réformée',
  language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theological_terms_slug ON theological_terms(slug);
CREATE INDEX IF NOT EXISTS idx_theological_terms_category ON theological_terms(category);
CREATE INDEX IF NOT EXISTS idx_theological_terms_language ON theological_terms(language);

ALTER TABLE theological_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture pour tous les authentifiés" ON theological_terms
  FOR SELECT TO authenticated USING (true);

-- Données initiales — termes clés évangéliques réformés en français
INSERT INTO theological_terms (term, slug, short_def, definition, extended, category, key_verses, related_terms) VALUES
('Grâce', 'grace', 'Faveur imméritée de Dieu envers le pécheur',
 'La grâce est la faveur souveraine et gratuite que Dieu accorde aux pécheurs qui ne la méritent pas. Elle est le fondement du salut chrétien : c''est par grâce que nous sommes sauvés, par le moyen de la foi, et non par nos œuvres (Éphésiens 2:8-9). La tradition réformée distingue la grâce commune (accordée à tous) de la grâce particulière (accordée aux élus pour le salut).',
 'La grâce (grec : χάρις, charis) est au cœur de la théologie réformée résumée dans les cinq points de l''arminianisme et du calvinisme. Elle est irrésistible selon la théologie réformée : ceux que Dieu appelle efficacement viennent à Christ (Jean 6:37-44). Elle précède la foi et non l''inverse.',
 'soteriologie', '["Éphésiens 2:8-9", "Romains 5:1-2", "Tite 2:11", "Jean 1:14"]', '{"Foi", "Justification", "Élection", "Salut"}'),

('Foi', 'foi', 'Confiance et adhésion au Christ et à sa Parole',
 'La foi biblique est une confiance personnelle en Dieu et en l''Évangile de Jésus-Christ. Elle comporte trois éléments : la connaissance (notitia), l''assentiment intellectuel (assensus), et la confiance personnelle (fiducia). C''est par la foi seule (sola fide) que nous sommes justifiés devant Dieu.',
 'La foi n''est pas une œuvre humaine mais un don de Dieu (Éphésiens 2:8). Elle est la main tendue qui reçoit la grâce. La Confession de Westminster définit la foi comme "l''acte par lequel le croyant reçoit et repose sur Christ seul pour la justification, la sanctification et la vie éternelle."',
 'soteriologie', '["Hébreux 11:1", "Romains 10:17", "Galates 2:20", "Jacques 2:17"]', '{"Grâce", "Justification", "Repentance", "Conversion"}'),

('Justification', 'justification', 'Déclaration judiciaire par laquelle Dieu déclare le pécheur juste',
 'La justification est l''acte souverain par lequel Dieu déclare juste le pécheur croyant en imputant à son compte la justice parfaite de Christ. C''est un acte légal et instantané, non un processus. Elle repose sur l''obéissance active et passive de Christ : son obéissance parfaite à la loi et sa mort expiatoire.',
 'Luther a redécouvert que "le juste vivra par la foi" (Romains 1:17). La justification est distincte de la sanctification : la justification change notre statut devant Dieu, la sanctification change notre nature intérieure. Ensemble, elles constituent ce que les théologiens appellent "l''application du salut".',
 'soteriologie', '["Romains 3:24-28", "Romains 5:1", "Galates 2:16", "Philippiens 3:9"]', '{"Grâce", "Foi", "Sanctification", "Rédemption", "Imputation"}'),

('Sanctification', 'sanctification', 'Processus de transformation par lequel le croyant devient plus semblable à Christ',
 'La sanctification est l''œuvre progressive de l''Esprit Saint par laquelle le croyant est transformé pour être conforme à l''image de Christ. Contrairement à la justification (instantanée), la sanctification est un processus qui dure toute la vie chrétienne. Elle implique la coopération du croyant avec l''Esprit.',
 'La sanctification comprend une dimension définitive (1 Corinthiens 6:11 — "vous avez été sanctifiés") et une dimension progressive (1 Thessaloniciens 4:3). Elle se manifeste dans la mortification du péché et la vivification de la justice. La Parole, la prière, les sacrements et la communion fraternelle sont les moyens de grâce qui la favorisent.',
 'soteriologie', '["1 Thessaloniciens 4:3", "Romains 12:2", "2 Corinthiens 3:18", "Jean 17:17"]', '{"Justification", "Esprit Saint", "Repentance", "Obéissance"}'),

('Trinité', 'trinite', 'Un seul Dieu existant en trois personnes distinctes',
 'La doctrine de la Trinité affirme qu''il existe un seul Dieu éternel qui subsiste en trois personnes distinctes et coégales : le Père, le Fils et le Saint-Esprit. Ces trois personnes sont un seul Dieu, non trois dieux. Cette doctrine est le cœur du christianisme historique, affirmée par le Concile de Nicée (325) et le Concile de Constantinople (381).',
 'La Trinité n''est pas explicitée dans un seul verset mais se dégage de l''ensemble des Écritures. Le Père envoie le Fils (Jean 3:16), le Fils envoie l''Esprit (Jean 15:26), et les trois personnes agissent ensemble dans le baptême de Jésus (Matthieu 3:16-17) et la grande commission (Matthieu 28:19).',
 'theologie-fondamentale', '["Matthieu 28:19", "2 Corinthiens 13:13", "Jean 1:1", "Matthieu 3:16-17"]', '{"Père", "Christ", "Esprit Saint", "Incarnation"}'),

('Incarnation', 'incarnation', 'Le Fils éternel de Dieu qui prend une nature humaine',
 'L''incarnation est le mystère par lequel le Fils éternel de Dieu a pris une nature humaine complète dans le sein de la vierge Marie, sans cesser d''être pleinement Dieu. Jésus-Christ est ainsi pleinement Dieu et pleinement homme — deux natures en une seule personne (définition du Concile de Chalcédoine, 451).',
 'L''incarnation n''est pas une diminution de la divinité mais une addition de l''humanité. Le terme grec kenosis (Philippiens 2:7) ne signifie pas que le Fils a abandonné ses attributs divins mais qu''il a accepté volontairement des limites dans leur exercice.',
 'christologie', '["Jean 1:14", "Philippiens 2:6-8", "Hébreux 2:14", "1 Timothée 3:16"]', '{"Trinité", "Résurrection", "Rédemption", "Christ"}'),

('Résurrection', 'resurrection', 'Le retour à la vie corporelle de Jésus après sa mort',
 'La résurrection de Jésus-Christ est l''événement central de la foi chrétienne. Elle affirme que Jésus est réellement mort et qu''il est réellement revenu à la vie corporellement le troisième jour. Ce n''est pas une résurrection spirituelle ou symbolique mais une résurrection physique et historique.',
 'Paul dit : "Si Christ n''est pas ressuscité, votre foi est vaine" (1 Corinthiens 15:14). La résurrection garantit notre propre résurrection future (1 Corinthiens 15:20-23), prouve la justice de la mort du Christ (Romains 4:25), et démontré la divinité du Christ (Romains 1:4). Elle est la victoire sur la mort et le péché.',
 'christologie', '["1 Corinthiens 15:3-8", "Romains 1:4", "Matthieu 28:6", "Jean 20:27-29"]', '{"Incarnation", "Rédemption", "Eschatologie", "Corps glorifié"}'),

('Rédemption', 'redemption', 'La délivrance du péché par le sang de Christ',
 'La rédemption (grec : apolutrosis) est la délivrance du pécheur de l''esclavage du péché et de la condamnation par le paiement d''une rançon — le sang de Jésus-Christ. Elle implique que le pécheur était captif, qu''un prix a été payé, et qu''il a été libéré.',
 'La rédemption accomplie par Christ est définitive et suffisante pour tous ceux qui croient. Elle englobe le pardon des péchés (Éphésiens 1:7), la réconciliation avec Dieu (2 Corinthiens 5:18-19) et la délivrance future du corps (Romains 8:23). Elle est à la fois cosmique (elle renouvelle la création) et personnelle.',
 'soteriologie', '["Éphésiens 1:7", "Tite 2:14", "1 Pierre 1:18-19", "Galates 3:13"]', '{"Justification", "Expiation", "Réconciliation", "Grâce"}'),

('Péché', 'peche', 'Toute pensée, parole ou action contraire à la volonté de Dieu',
 'Le péché est tout acte de désobéissance à la loi de Dieu, en pensée, en parole ou en action (1 Jean 3:4). Il inclut aussi l''omission du bien qu''on aurait dû faire. La Bible distingue le péché originel (hérité d''Adam) et les péchés actuels (ceux que nous commettons).',
 'Le péché originel a corrompu toute la nature humaine (dépravation totale selon la théologie réformée), non pas en ce que l''homme est aussi mauvais qu''il pourrait l''être, mais en ce que la corruption affecte toutes ses facultés : intellect, volonté, émotions. C''est pourquoi il est incapable de venir à Dieu par lui-même sans la grâce.',
 'anthropologie', '["Romains 3:23", "1 Jean 1:8", "Romains 5:12", "Génèse 3:6"]', '{"Repentance", "Pardon", "Rédemption", "Grâce"}'),

('Repentance', 'repentance', 'Changement d''esprit et de direction qui se tourne vers Dieu',
 'La repentance (grec : metanoia, littéralement "changement d''esprit") est un retournement complet du pécheur vers Dieu. Elle implique : la reconnaissance du péché, la douleur pour le péché (contrition), l''abandon du péché, et le retour à Dieu. La repentance n''est pas une punition mais une grâce.',
 'La repentance biblique est différente du remords (qui peut être un simple regret de conséquences). Paul distingue "la tristesse selon Dieu" (qui produit la repentance) de la "tristesse du monde" (qui produit la mort) en 2 Corinthiens 7:10. La repentance et la foi sont les deux réponses que Dieu exige de l''homme face à l''Évangile.',
 'soteriologie', '["Actes 3:19", "Marc 1:15", "2 Corinthiens 7:10", "Luc 15:7"]', '{"Foi", "Pardon", "Péché", "Conversion"}'),

('Expiation', 'expiation', 'Satisfaction faite à Dieu pour le péché par le sacrifice de Christ',
 'L''expiation (anglais : atonement) est l''œuvre par laquelle Jésus-Christ a satisfait les exigences de la justice divine et réconcilié les pécheurs avec Dieu. Elle inclut : la propitiation (apaisement de la colère divine), la rédemption (paiement de la rançon), et la réconciliation (rétablissement de la relation).',
 'Plusieurs théories expliquent comment fonctionne l''expiation : la théorie de la substitution pénale (Christ a subi la punition à notre place), la satisfaction de Dieu, la théorie de l''exemple, etc. La théologie réformée insiste sur la substitution pénale et l''expiation définie (Christ est mort spécifiquement pour les élus).',
 'soteriologie', '["Ésaïe 53:5", "Romains 3:25", "1 Jean 2:2", "Hébreux 9:12"]', '{"Rédemption", "Justification", "Réconciliation", "Sacrifice"}'),

('Esprit Saint', 'esprit-saint', 'Troisième personne de la Trinité, Dieu demeurant dans le croyant',
 'L''Esprit Saint est la troisième personne de la Trinité, pleinement Dieu, coégal et coéternel avec le Père et le Fils. Il est l''agent de la nouvelle naissance (Jean 3:5-8), de la sanctification, de la conviction de péché, de l''intercession, de l''illumination des Écritures et de la distribution des dons spirituels.',
 'À la Pentecôte (Actes 2), l''Esprit Saint a été répandu sur tous les croyants comme Jésus l''avait promis (Jean 14:16-17). Il habite dans chaque croyant (1 Corinthiens 6:19). La théologie réformée distingue son œuvre générale dans la création et l''œuvre spéciale dans le salut. Le débat charismatique porte sur la continuité ou non des dons sign.',
 'pneumatologie', '["Jean 14:16-17", "Actes 2:1-4", "Romains 8:26", "1 Corinthiens 12:4-11"]', '{"Trinité", "Sanctification", "Dons spirituels", "Nouvelle naissance"}'),

('Église', 'eglise', 'La communauté des croyants rassemblés par Christ',
 'L''Église (grec : ekklesia, "assemblée") est la communauté universelle de tous les vrais croyants en Jésus-Christ à travers les âges, ainsi que les assemblées locales visibles de croyants professants. Elle est le Corps de Christ (Éphésiens 1:22-23) et l''épouse de Christ (Apocalypse 21:2).',
 'Les réformateurs distinguaient l''Église visible (tous ceux qui professent la foi et leurs enfants) et l''Église invisible (les vrais élus connus de Dieu seul). Les marques d''une vraie Église selon la Réforme : la prédication fidèle de la Parole, l''administration correcte des sacrements, et la discipline ecclésiastique.',
 'ecclesiologie', '["Matthieu 16:18", "Éphésiens 1:22-23", "Actes 2:42-47", "1 Corinthiens 12:12-13"]', '{"Baptême", "Sainte Cène", "Discipline", "Sacrements"}'),

('Baptême', 'bapteme', 'Sacrement d''initiation chrétienne par immersion ou aspersion d''eau',
 'Le baptême est l''un des deux sacrements institués par Christ (Matthieu 28:19). Il est le signe d''initiation dans la nouvelle alliance et signifie l''union avec Christ dans sa mort et sa résurrection (Romains 6:3-4), le pardon des péchés et le don de l''Esprit (Actes 2:38). Les débats portent sur le mode (immersion vs aspersion) et les candidats (croyants seuls vs croyants et leurs enfants).',
 'La tradition réformée pratique le pédobaptisme (baptême des enfants de croyants) comme signe de la nouvelle alliance, analogie du signe de l''ancienne alliance (circoncision - Colossiens 2:11-12). Les baptistes pratiquent le baptême des croyants seuls (crédobaptisme). L''ARC est évangélique-réformée avec sensibilité charismatique.',
 'ecclesiologie', '["Matthieu 28:19", "Romains 6:3-4", "Actes 2:38", "Colossiens 2:11-12"]', '{"Église", "Sainte Cène", "Alliance", "Esprit Saint"}'),

('Sainte Cène', 'sainte-cene', 'Sacrement du souvenir de la mort de Christ par le pain et le vin',
 'La Sainte Cène (ou Cène du Seigneur, Eucharistie, Communion) est le deuxième sacrement institué par Christ (Luc 22:19-20). Elle commémore la mort de Christ, célèbre notre union à lui, et anticipe le banquet du Royaume. Les débats portent sur la présence de Christ : transsubstantiation (catholique), consubstantiation (luthérienne), présence spirituelle réelle (réformée), ou simple mémorial (zwinglienne).',
 'La position réformée (Calvin) affirme une présence spirituelle réelle de Christ dans la Sainte Cène : par l''Esprit, les croyants communient réellement au Corps et au Sang de Christ — non pas physiquement mais spirituellement. C''est plus qu''un simple mémorial, mais sans transsubstantiation matérielle.',
 'ecclesiologie', '["Luc 22:19-20", "1 Corinthiens 11:23-26", "Jean 6:53-56", "1 Corinthiens 10:16"]', '{"Baptême", "Église", "Sacrifie", "Alliance"}'),

('Eschatologie', 'eschatologie', 'L''étude des événements de la fin des temps',
 'L''eschatologie (grec : eschatos = dernier, logos = étude) est la branche de la théologie qui étudie les réalités ultimes : la mort, la résurrection des morts, le jugement final, le retour de Christ (Parousia), et l''état éternel. Ces sujets sont parmi les plus débattus dans le christianisme évangélique.',
 'Les principales positions eschatologiques sur le Millénium : Amillénialisme (règne symbolique actuel de Christ — position réformée prédominante), Prémillénialisme (Christ revient avant le règne de 1000 ans — inclut le dispensationalisme), Postmillénialisme (l''Évangile transforme le monde avant le retour de Christ). Sur le Rapt : préTribulationnisme, midTrib, postTrib.',
 'eschatologie', '["1 Thessaloniciens 4:16-17", "Apocalypse 20:1-6", "Jean 5:28-29", "Matthieu 24:27"]', '{"Résurrection", "Jugement", "Parousia", "Royaume"}'),

('Élection', 'election', 'Le choix souverain de Dieu de sauver certains pécheurs',
 'L''élection (ou prédestination) est la doctrine selon laquelle Dieu a choisi souverainement, avant la fondation du monde, ceux qu''il sauverait. Ce choix est basé uniquement sur sa volonté souveraine et son amour gratuit, non sur une prévision de la foi ou des œuvres humaines.',
 'La théologie réformée (calvinisme) affirme l''élection inconditionnelle : Dieu élit sans condition en l''homme. La théologie arminienne affirme l''élection conditionnelle : Dieu élit ceux dont il prévoit qu''ils croiront librement. Ce débat entre Calvin et Arminius a structuré la théologie évangélique pendant des siècles. Les deux positions affirment la réalité de l''élection et la responsabilité humaine.',
 'soteriologie', '["Éphésiens 1:4-5", "Romains 8:29-30", "Jean 6:37-44", "Romains 9:11-13"]', '{"Grâce", "Salut", "Repentance", "Providence"}'),

('Pardon', 'pardon', 'La rémission des péchés accordée par Dieu par grâce',
 'Le pardon est l''acte par lequel Dieu remet les péchés du pénitent qui croit en Christ. Ce pardon est complet, définitif et fondé uniquement sur le sacrifice expiatoire de Christ. Dieu pardonne "gratuitement" (Romains 3:24), non parce que nos péchés sont légers, mais parce que Christ les a portés.',
 'Le pardon implique la non-imputation des péchés (Psaume 32:2), la restauration de la relation avec Dieu, et la libération de la culpabilité. Il est conditionné à la repentance et à la foi, mais non à la qualité de notre repentance. Le pardon accordé à d''autres est aussi un commandement pour le croyant (Matthieu 6:14-15).',
 'soteriologie', '["1 Jean 1:9", "Psaume 103:12", "Éphésiens 1:7", "Colossiens 2:13"]', '{"Repentance", "Grâce", "Rédemption", "Réconciliation"}'),

('Alliance', 'alliance', 'Engagement solennel entre Dieu et son peuple',
 'Une alliance (hébreu : berit, grec : diatheke) est un accord solennel entre Dieu et son peuple. La théologie de l''alliance (ou fédérale) organise toute l''histoire biblique autour de plusieurs alliances : l''Alliance de la Rédemption (entre les personnes de la Trinité), l''Alliance des Œuvres (avec Adam), l''Alliance de la Grâce (après la chute).',
 'Les grandes alliances bibliques sont : Noé (Génèse 9), Abraham (Génèse 15 et 17), Moïse/Sinaï (Exode 19-20), David (2 Samuel 7), et la Nouvelle Alliance (Jérémie 31:31-34, accomplie en Christ). La Nouvelle Alliance est supérieure aux précédentes car elle est intérieure (la loi écrite sur le cœur) et universelle.',
 'theologie-fondamentale', '["Jérémie 31:31-34", "Hébreux 8:6-13", "Luc 22:20", "Génèse 15:18"]', '{"Baptême", "Sainte Cène", "Élection", "Promesse"}'),

('Prière', 'priere', 'Communication avec Dieu en parole, silence ou gémissement',
 'La prière est la communion vivante avec Dieu, le Père, par Jésus-Christ, dans l''Esprit Saint. Elle inclut l''adoration, la confession, la supplication, l''intercession et l''action de grâces. Jésus a enseigné à prier le "Notre Père" (Matthieu 6:9-13) comme modèle.',
 'La prière n''est pas un moyen d''influencer Dieu mais de s''aligner sur sa volonté. La théologie réformée insiste que Dieu répond à la prière dans le cadre de sa providence. La prière est un moyen de grâce — par elle, Dieu nous donne ce qu''il a prévu de donner par la prière. L''Esprit nous aide dans la prière (Romains 8:26-27).',
 'vie-chretienne', '["Matthieu 6:9-13", "Philippiens 4:6-7", "Romains 8:26-27", "1 Thessaloniciens 5:17"]', '{"Intercession", "Esprit Saint", "Foi", "Adoration"}'),

('Évangile', 'evangile', 'La bonne nouvelle du salut par Christ crucifié et ressuscité',
 'L''Évangile (grec : euangelion = bonne nouvelle) est le message central du christianisme : Jésus-Christ, Fils de Dieu, est mort pour nos péchés selon les Écritures, a été enseveli, et est ressuscité le troisième jour selon les Écritures (1 Corinthiens 15:3-4). Ce message appelle à la repentance et à la foi.',
 'Paul dit que l''Évangile est "la puissance de Dieu pour le salut de quiconque croit" (Romains 1:16). Il n''y a qu''un seul Évangile (Galates 1:6-9). L''Évangile inclut des faits historiques (mort et résurrection), leur interprétation théologique (expiation pour les péchés), et un appel à répondre (repentance et foi).',
 'theologie-fondamentale', '["1 Corinthiens 15:3-4", "Romains 1:16-17", "Marc 1:15", "Jean 3:16"]', '{"Foi", "Rédemption", "Salut", "Repentance"}'),

('Providence', 'providence', 'Le gouvernement souverain de Dieu sur toute la création',
 'La providence est l''action continue de Dieu par laquelle il préserve, accompagne et gouverne toutes choses selon sa volonté, pour la gloire de son nom et le bien de ses élus (Romains 8:28). Elle n''est pas un fatalisme aveugle mais l''expression d''un Dieu sage, bon et souverain.',
 'La Confession de Westminster (Ch. 5) définit la providence comme : Dieu, le grand Créateur, soutient, dirige, ordonne et gouverne toutes les créatures, toutes les actions et toutes les choses. Cela inclut les actes humains libres et même le mal (sans que Dieu en soit l''auteur moral). Joseph en est l''illustration (Génèse 50:20).',
 'theologie-fondamentale', '["Romains 8:28", "Proverbes 16:9", "Matthieu 10:29-30", "Génèse 50:20"]', '{"Élection", "Souveraineté", "Création", "Foi"}'),

('Réconciliation', 'reconciliation', 'Rétablissement de la relation entre Dieu et le pécheur',
 'La réconciliation est le rétablissement d''une relation de paix entre Dieu et le pécheur, rendue possible par l''expiation de Christ. Elle est à la fois une réalité objective (accomplie par Christ) et subjective (réalisée par la foi). "Soyez réconciliés avec Dieu" (2 Corinthiens 5:20) est le cœur du message de l''Évangile.',
 'Paul présente Christ comme le Grand Réconciliateur : "Tout cela vient de Dieu, qui nous a réconciliés avec lui par Christ et qui nous a donné le ministère de la réconciliation" (2 Corinthiens 5:18). La réconciliation est cosmique (Colossiens 1:20) et personnelle (Romains 5:10-11).',
 'soteriologie', '["2 Corinthiens 5:18-20", "Romains 5:10-11", "Colossiens 1:20", "Éphésiens 2:16"]', '{"Expiation", "Rédemption", "Justification", "Pardon"}'),

('Nouveau Testament', 'nouveau-testament', 'Les 27 livres de la Bible qui révèlent l''accomplissement de la promesse en Christ',
 'Le Nouveau Testament est la collection des 27 livres inspirés qui témoignent de la vie, de l''enseignement, de la mort et de la résurrection de Jésus-Christ, ainsi que de l''expansion de l''Église apostolique. Il est divisé en Évangiles, Actes, Épîtres et Apocalypse.',
 'Le NT est l''accomplissement de l''AT (Matthieu 5:17). Christ est le centre et la clé herméneutique des Écritures. Le canon du NT a été reconnu progressivement par l''Église au cours des premiers siècles, avec Athanase qui le fixe pour la première fois en 367 ap. J.-C. Chaque livre est pleinement inspiré par l''Esprit Saint.',
 'bibliologie', '["2 Timothée 3:16", "Matthieu 5:17", "Hébreux 1:1-2", "Jean 20:31"]', '{"Ancien Testament", "Canon", "Inspiration", "Herméneutique"}'),

('Ancien Testament', 'ancien-testament', 'Les 39 livres de la Bible qui révèlent la préparation à la venue du Christ',
 'L''Ancien Testament est la collection des 39 livres inspirés écrits avant la venue de Christ, formant le canon hébreu. Il comprend la Torah (Loi), les Prophètes et les Écrits. Il révèle la création, la chute, les alliances de Dieu et la préparation au salut accompli en Christ.',
 'L''AT est pleinement Parole de Dieu (2 Timothée 3:16) et indispensable pour comprendre le NT. Luther disait que l''AT est le "berceau" dans lequel repose Christ. L''herméneutique chrétienne lit l''AT à la lumière du Christ : il est promesse là où le NT est accomplissement.',
 'bibliologie', '["2 Timothée 3:16", "Luc 24:27", "Jean 5:39", "Romains 15:4"]', '{"Nouveau Testament", "Alliance", "Prophétie", "Herméneutique"}')
ON CONFLICT (slug) DO NOTHING;
