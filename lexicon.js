// Context words, per language. They decide whether a bare number such as
// "2026" reads as a year or as a quantity. Entries are separated by white
// space and may use regular-expression syntax (\s+ for a space inside a phrase).
//
//   strongBefore   words that almost always introduce a year      "since 1998"
//   weakBefore     words that introduce years and quantities      "in 2026"
//   blockBefore    words that introduce a quantity or a label     "about 2000", "Room 2026"
//   strongAfter    words that almost always follow a year         "2000 was"
//   unitAfter      words that make the number a quantity          "2000 people"
//   functionWords  lowercase words that may follow a year without making it
//                  a quantity                                     "in 2026 we"
//   connectors     words that join years into a list or a range   "2024 and 2025"
//   articles       definite articles: a number followed by one is
//                  not counting the next noun                     "erhielt 1385 das Privileg"
//   dateHeader     table headers of a column of years             "Year"
//   quantityHeader table headers of a column of quantities        "Price"
(function (root) {
  'use strict';

  const raw = String.raw;

  const LEXICON = {
    en: {
      strongBefore: raw`year years yr since circa ca copyright anno ad early mid late spring summer
        autumn fall winter q[1-4] h[12] fy est established founded born died released published
        updated during until till`,
      weakBefore: raw`in of for by from the before after between into through throughout`,
      blockBefore: raw`about approximately approx roughly nearly almost over under least than
        total\s+of number\s+of no\. nr\. room flight page pp? model version ver vol id ref code
        port box suite apt unit line chapter item order ticket invoice issue pin ext windows
        office`,
      strongAfter: raw`was will saw marked edition season elections? olympics census calendar vintage`,
      unitAfter: raw`people persons users members employees students participants respondents
        visitors customers inhabitants residents items units pieces copies pages words characters
        lines times points votes views likes followers subscribers comments reviews results
        downloads steps calories kcal cal km kms kilometers kilometres miles mi m meters metres
        feet ft cm mm kg g lbs lb pounds tons tonnes liters litres ml gallons hours hrs h minutes
        mins min seconds secs sec days weeks months years yrs dollars usd euros eur gbp bucks
        cents px pixels dpi rpm mph kph kb mb gb tb mah watts w kw kwh volts v hz khz mhz ghz bc
        bce b\.c\. percent each sq square acres hectares degrees soldiers men women children
        troops deaths cases jobs homes houses cars vehicles or\s+so`,
      functionWords: raw`and or to was is were are we i he she they it the a an at on in of with
        when as but there this that will would has had have by for from after before until alone
        onwards onward if so because while than not also his her their our its my your you then
        according due thanks compared versus vs saw marked brought began ended`,
      connectors: raw`and or to vs\.? &`,
      articles: raw`the`,
      dateHeader: raw`year years date dated released release founded established born died
        published opened built introduced launched since from until`,
      quantityHeader: raw`price cost amount total subtotal qty quantity count number score points
        population sales revenue votes size weight height length distance elevation altitude area
        capacity units stock balance salary budget views`,
    },

    it: {
      strongBefore: raw`anno anni nel dal entro nato nata morto morta fondato fondata pubblicato
        aggiornato estate inverno primavera autunno inizio fine metà`,
      weakBefore: raw`del al il di da per tra fra dopo prima fino verso`,
      blockBefore: raw`quasi oltre almeno più\s+di meno\s+di totale\s+di numero\s+di stanza camera
        volo pagina pag modello versione codice porta articolo ordine biglietto fattura n\.`,
      strongAfter: raw`fu sarà edizione stagione`,
      unitAfter: raw`persone utenti membri studenti dipendenti partecipanti visitatori clienti
        abitanti articoli pezzi copie pagine parole caratteri righe volte punti voti
        visualizzazioni commenti recensioni risultati passi calorie chilometri miglia metri chili
        chilogrammi grammi litri ore minuti secondi giorni settimane mesi anni euro dollari
        centesimi soldati uomini donne bambini morti casi a\.c\.`,
      functionWords: raw`e ed o è era fu sono ha hanno il la lo i gli le un una di da in con su per
        che non ma si ci come quando anche più sarà abbiamo`,
      connectors: raw`e ed o al a`,
      articles: raw`il lo la gli le`,
      dateHeader: raw`anno anni data nascita fondazione uscita`,
      quantityHeader: raw`prezzo importo totale quantità costo numero punteggio popolazione abitanti
        altitudine superficie`,
    },

    es: {
      strongBefore: raw`año años desde hasta durante verano invierno primavera otoño nacido nacida
        fallecido fundado fundada publicado principios finales mediados`,
      weakBefore: raw`en de del el para por entre tras antes después hacia al`,
      blockBefore: raw`casi unos unas aproximadamente más\s+de menos\s+de total\s+de número\s+de
        habitación vuelo página pág modelo versión código puerto pedido factura n\.º nº`,
      strongAfter: raw`fue será edición temporada`,
      unitAfter: raw`personas usuarios miembros estudiantes empleados participantes visitantes
        clientes habitantes artículos piezas copias páginas palabras caracteres líneas veces
        puntos votos visitas comentarios reseñas resultados pasos calorías kilómetros millas
        metros kilos kilogramos gramos litros horas minutos segundos días semanas meses años
        euros dólares pesos céntimos soldados hombres mujeres niños muertos casos a\.\s?c\.`,
      functionWords: raw`y o e u es era fue son ha han el la los las un una de en con por para que
        no pero se como cuando también más será`,
      connectors: raw`y o e u a al`,
      articles: raw`el la los las`,
      dateHeader: raw`año años fecha nacimiento fundación estreno`,
      quantityHeader: raw`precio importe total cantidad coste costo número puntuación población
        habitantes altitud superficie`,
    },

    fr: {
      strongBefore: raw`an année années depuis jusqu'en durant pendant hiver printemps automne né
        née mort morte fondé fondée publié début fin courant`,
      weakBefore: raw`en de du pour par entre après avant vers dès d'ici`,
      blockBefore: raw`environ presque près\s+de plus\s+de moins\s+de total\s+de nombre\s+de chambre
        vol page modèle version code port commande facture n°`,
      strongAfter: raw`fut sera édition saison`,
      unitAfter: raw`personnes utilisateurs membres étudiants employés participants visiteurs
        clients habitants articles pièces exemplaires pages mots caractères lignes fois points
        voix vues commentaires avis résultats calories kilomètres mètres kilos kilogrammes grammes
        litres heures minutes secondes jours semaines mois ans années euros dollars centimes
        soldats hommes femmes enfants morts av\.\s?j\.-c\.`,
      functionWords: raw`et ou est était fut sont a ont le la les un une de du des en avec sur pour
        que qui ne pas mais se comme quand aussi plus sera nous il elle ils`,
      connectors: raw`et ou à au`,
      articles: raw`le la les`,
      dateHeader: raw`an année années date naissance fondation sortie`,
      quantityHeader: raw`prix montant total quantité coût nombre score population habitants
        altitude superficie`,
    },

    de: {
      strongBefore: raw`jahr jahre jahres jahren seit während sommer winter frühling frühjahr herbst
        geboren gestorben gegründet veröffentlicht anfang ende mitte`,
      weakBefore: raw`im von vom für bis nach vor um ab zwischen der das dem`,
      blockBefore: raw`etwa ungefähr rund fast über mindestens mehr\s+als weniger\s+als insgesamt
        zimmer flug seite modell bestellung rechnung nr\.`,
      strongAfter: raw`war wurde wird ausgabe saison`,
      unitAfter: raw`menschen personen nutzer benutzer mitglieder studenten mitarbeiter teilnehmer
        besucher kunden einwohner artikel stück exemplare seiten wörter zeichen zeilen mal punkte
        stimmen aufrufe kommentare bewertungen ergebnisse schritte kalorien kilometer meilen meter
        kilo kilogramm gramm liter stunden minuten sekunden tage wochen monate jahre jahren euro
        dollar cent soldaten männer frauen kinder tote fälle häuser autos v\.\s?chr\.`,
      functionWords: raw`und oder ist war wurde sind hat haben der die das ein eine von in mit auf
        für dass nicht aber sich wie als auch mehr wird wir er sie es`,
      connectors: raw`und oder bis`,
      articles: raw`der die das den dem des`,
      dateHeader: raw`jahr jahre datum geburt gründung erscheinungsjahr`,
      quantityHeader: raw`preis betrag summe menge kosten anzahl punkte einwohner bevölkerung höhe
        fläche`,
    },

    pt: {
      strongBefore: raw`ano anos desde até durante verão inverno primavera outono nascido nascida
        falecido fundado fundada publicado início fim meados`,
      weakBefore: raw`em de do no para por entre após antes o ao`,
      blockBefore: raw`cerca\s+de quase aproximadamente mais\s+de menos\s+de total\s+de número\s+de
        quarto voo página pág modelo versão código porta pedido fatura n\.º nº`,
      strongAfter: raw`foi será edição temporada`,
      unitAfter: raw`pessoas usuários utilizadores membros estudantes funcionários participantes
        visitantes clientes habitantes artigos peças cópias páginas palavras caracteres linhas
        vezes pontos votos visualizações comentários avaliações resultados passos calorias
        quilômetros quilómetros milhas metros quilos gramas litros horas minutos segundos dias
        semanas meses anos euros dólares reais centavos soldados homens mulheres crianças mortos
        casos a\.\s?c\.`,
      functionWords: raw`e ou é era foi são tem têm o a os as um uma de em com por para que não mas
        se como quando também mais será`,
      connectors: raw`e ou a ao`,
      articles: raw`os as`,
      dateHeader: raw`ano anos data nascimento fundação lançamento`,
      quantityHeader: raw`preço valor total quantidade custo número pontuação população habitantes
        altitude área`,
    },
  };

  // All languages are used together: pages mix languages, and their declared
  // language is often wrong.
  function merged(field) {
    const entries = new Set();
    for (const language of Object.values(LEXICON)) {
      for (const entry of language[field].trim().split(/\s+/)) entries.add(entry);
    }
    return [...entries].sort((a, b) => b.length - a.length);
  }

  // Languages that capitalise every noun: there, a lowercase word after a
  // number cannot be the thing being counted.
  const NOUNS_CAPITALISED = ['de'];

  const api = { LEXICON, NOUNS_CAPITALISED, merged };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Year12000Lexicon = api;
})(globalThis);
