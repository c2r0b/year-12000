// Pure text logic: find years inside a string and shift them by +10,000.
// No DOM access here, so it can be tested with plain Node (see test/unit).
(function (root) {
  'use strict';

  const { merged, NOUNS_CAPITALISED } =
    typeof module !== 'undefined' && module.exports ? require('./lexicon.js') : root.Year12000Lexicon;

  const W = String.raw`\p{L}\p{N}_`; // "word" characters, Unicode-aware
  const DAY = String.raw`(?:0?[1-9]|[12]\d|3[01])`;
  const MONTH = String.raw`(?:0?[1-9]|1[0-2])`;
  const BARE_YEAR = String.raw`(?:1\d{3}|20\d{2})`; // 1000–2099
  const DAY_NAME = String.raw`\d{1,2}(?:st|nd|rd|th)?`; // 16, 16th
  const HYPHEN_PREFIX = String.raw`(?:mid|pre|post|early|late)-`;

  const WORD_START = String.raw`(?<![${W}])`;
  const WORD_END = String.raw`(?![${W}])`;
  const anyOf = (field) => merged(field).join('|');

  // ---------------------------------------------------------------------------
  // Dates with an unmistakable shape: these need no further evidence.
  // ---------------------------------------------------------------------------

  // Month names ("November", "nov", "novembre", ...) for the given locales.
  function monthNames(locales) {
    const names = new Set(['sept']);
    for (const locale of new Set([...locales, 'en'])) {
      if (!locale) continue;
      try {
        for (const style of ['long', 'short']) {
          const format = new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' });
          for (let month = 0; month < 12; month++) {
            const name = format
              .format(new Date(Date.UTC(2001, month, 15)))
              .toLowerCase()
              .replace(/\.$/, '');
            if (/^\p{L}{3,}$/u.test(name)) names.add(name);
          }
        }
      } catch {
        // Unknown or malformed locale tag: ignore it.
      }
    }
    return [...names].sort((a, b) => b.length - a.length);
  }

  function buildDateRules(months) {
    const sources = [
      // 2026-11-16, 2026/11/16, 2026.11.16, 2026-11-16T10:00
      String.raw`(?<![${W}.\-/])(?<year>\d{4})(?=([-/.])${MONTH}\2${DAY}(?!\d))`,

      // 16/11/2026, 11-16-2026, 16.11.2026
      String.raw`(?<![${W}.\-/])(?<pre>${DAY}(?<sep>[-/.])${DAY}\k<sep>)(?<year>\d{4})(?![${W}]|[-/.]\d)`,

      // 11/2026, 03-2026
      String.raw`(?<![${W}.\-/])(?<pre>(?:0[1-9]|1[0-2])[-/])(?<year>${BARE_YEAR})(?![${W}]|[-/.,:]\d)`,

      // November 2026, Nov 16, 2026, July 16–24, 1969, 16 novembre 2026,
      // 16 de noviembre de 2026
      String.raw`(?<![${W}])(?<pre>(?:${months})\.?,?\s+(?:(?:de|del|di|of)\s+)?(?:${DAY_NAME}(?:\s?[-–]\s?${DAY_NAME})?[.,]?\s+(?:(?:de|del)\s+)?)?)(?<year>\d{4})(?![${W}]|[.,:]\d)`,

      // 2026年11月16日, 2026년
      String.raw`(?<![${W}])(?<year>\d{4})(?=\s?[年년])`,

      // Decades: the 1990s, 1990's, mid-1990s, die 1990er. Not "1000s of ...".
      String.raw`(?:(?<![${W}.,:/#€£¥$+\-])|(?<=${WORD_START}${HYPHEN_PREFIX}))(?<year>(?:1\d|20)\d0)(?=(?:['’]?s(?!\s+of${WORD_END})|er[ns]?)${WORD_END})`,

      // mid-2026, pre-2020, post-1945
      String.raw`${WORD_START}(?<pre>${HYPHEN_PREFIX})(?<year>${BARE_YEAR})(?![${W}]|[.,:]\d|-\d)`,
    ];
    return sources.map((source) => new RegExp(source, 'giu'));
  }

  // ---------------------------------------------------------------------------
  // Bare numbers ("2026" on its own). A number is only treated as a year when
  // the text around it says so; when in doubt it is left alone. The word lists
  // live in lexicon.js.
  // ---------------------------------------------------------------------------

  // Step 1: candidates. Characters glued to the number already rule out prices,
  // decimals, phone numbers, identifiers and so on.
  const CANDIDATE = new RegExp(
    String.raw`(?:(?<![${W}.,:/#€£¥$+\-]|[€£¥$]\s|\+\d{1,3}\s)|(?<=(?<![${W}\-/])${BARE_YEAR}[-/]))` +
      String.raw`(?<year>${BARE_YEAR})` +
      String.raw`(?![${W}]|[.,:]\d|[-/](?=\d)(?!(?:\d{2}|\d{4})(?![-/]?\d))|\s?[%€£¥$])`,
    'gu',
  );

  const BLOCK_BEFORE = new RegExp(
    String.raw`(?:${WORD_START}(?:${anyOf('blockBefore')})\.?|[~≈×=<>])\s*$`,
    'iu',
  );
  const UNIT_AFTER = new RegExp(String.raw`^[\s-]*(?:${anyOf('unitAfter')})${WORD_END}`, 'iu');
  const STRONG_BEFORE = new RegExp(
    String.raw`(?:${WORD_START}(?:${anyOf('strongBefore')})\.?|${WORD_START}c\.|©|\(c\))\s*$`,
    'iu',
  );
  const STRONG_AFTER = new RegExp(String.raw`^\s+(?:${anyOf('strongAfter')})${WORD_END}`, 'iu');
  const ERA_AFTER = new RegExp(
    String.raw`^\s+(?:AD|CE|A\.D\.|C\.E\.|d\.\s?C\.|n\.\s?Chr\.|ap\.\s?J\.-C\.)${WORD_END}`,
    'u',
  );
  const WEAK_BEFORE = new RegExp(String.raw`${WORD_START}(?:${anyOf('weakBefore')})\s+$`, 'iu');
  const FUNCTION_WORDS = new Set(merged('functionWords'));
  const ARTICLES = new Set(merged('articles'));

  // "2024, 2025 and 2026", "1939–1945", "2020 to 2024": judged as one group.
  const DASH_BETWEEN = /^\s*[-–—/]\s*$/;
  const LIST_BETWEEN = new RegExp(
    String.raw`^\s*(?:,|,?\s*(?:${anyOf('connectors')})\s)\s*$`,
    'iu',
  );

  const NOTHING = new RegExp(String.raw`^[^${W}]*$`, 'u');
  const WORD_BEFORE = /\p{L}\s+$/u;
  const SENTENCE_START = /(?:^|[.!?]\s)[^\p{L}\p{N}_]*$/u;
  const ENDS_AFTER = /^\s*(?:$|[.,:;!?)\]|·•–—-])/u;
  const SHORT_YEAR_AFTER = /^[-/–]\d{2}(?!\d)/;
  const LOWERCASE_WORD_AFTER = /^\s+(\p{Ll}[\p{L}'’]*)/u;
  const CAPITAL_WORD_AFTER = /^\s+\p{Lu}/u;

  function groupCandidates(text) {
    const groups = [];
    let previous = null;
    for (const match of text.matchAll(CANDIDATE)) {
      const candidate = { start: match.index, end: match.index + 4, year: Number(match[0]) };
      const between = previous ? text.slice(previous.end, candidate.start) : null;
      const dash = between !== null && DASH_BETWEEN.test(between);
      if (dash || (between !== null && LIST_BETWEEN.test(between))) {
        const group = groups[groups.length - 1];
        group.members.push(candidate);
        group.dashed ||= dash;
      } else {
        groups.push({ members: [candidate], dashed: false });
      }
      previous = candidate;
    }
    return groups;
  }

  function isYearGroup(text, group, options, language) {
    const { members } = group;
    const before = text.slice(0, members[0].start);
    const after = text.slice(members[members.length - 1].end);

    if (options.quantityContext) return false; // e.g. a table column headed "Price"
    if (BLOCK_BEFORE.test(before) || UNIT_AFTER.test(after)) return false;

    // Strong evidence.
    if (options.dateContext) return true; // e.g. inside <time>, or a column headed "Year"
    if (group.dashed) return true; // 1939–1945
    if (SHORT_YEAR_AFTER.test(after)) return true; // 2025-26, 2026-11
    if (STRONG_BEFORE.test(before) || STRONG_AFTER.test(after) || ERA_AFTER.test(after)) return true;
    if (language.monthBefore.test(before)) return true; // "Nov 16," in the element before
    if (/[([]\s*$/.test(before) && /^\s*[)\]]/.test(after)) return true; // (2026)

    // Weaker evidence: round and very old numbers are more often quantities,
    // so they need more than a preposition or a position in the sentence.
    const recent = members.every(({ year }) => year >= 1900);
    const unround = members.every(({ year }) => year % 100 !== 0);
    const plausible = unround && members.every(({ year }) => year >= 1500);
    const modern = unround && recent;

    const alone = NOTHING.test(before) && NOTHING.test(after);
    if (alone) return recent; // a table cell or a <span> holding just "2026"

    const follower = after.match(LOWERCASE_WORD_AFTER)?.[1];
    const followerIsNoun =
      follower !== undefined && !language.nounsCapitalised && !FUNCTION_WORDS.has(follower);

    if (WEAK_BEFORE.test(before)) return followerIsNoun ? plausible : true; // in 2026
    if (members.length > 1) return modern; // 2024, 2025 and 2026
    if (ARTICLES.has(follower)) return true; // erhielt 1385 das Privileg
    if (WORD_BEFORE.test(before) && ENDS_AFTER.test(after)) return modern; // World Cup 2026
    if (SENTENCE_START.test(before) && !followerIsNoun) {
      return modern && (follower !== undefined || CAPITAL_WORD_AFTER.test(after)); // 2026 World Cup
    }
    if (language.nounsCapitalised && WORD_BEFORE.test(before) && follower !== undefined) {
      return plausible; // gegründet und 1803 durch den Markgrafen
    }
    return false;
  }

  // `before` and `after` are the text around this piece inside the same block
  // of the page: they are read as context but never changed.
  function convertBareYears(text, options, language) {
    const before = options.before ?? '';
    const full = before + text + (options.after ?? '');
    const low = before.length;
    const high = low + text.length;

    const accepted = groupCandidates(full)
      .filter((group) => isYearGroup(full, group, options, language))
      .flatMap((group) => group.members)
      .filter(({ start, end }) => start >= low && end <= high);

    for (const { start, end, year } of accepted.reverse()) {
      text = text.slice(0, start - low) + String(year + 10000) + text.slice(end - low);
    }
    return { text, count: accepted.length };
  }

  // ---------------------------------------------------------------------------

  // createConverter(locales, pageLanguage): `locales` choose the month names,
  // `pageLanguage` is the language the page declares, if any.
  //
  // Returns convert(text, options) -> { text, count }.
  //   options.before / options.after   surrounding text, used only as context
  //   options.dateContext              the text is known to hold dates
  //   options.quantityContext          the text is known to hold quantities
  // Converting already-converted text is a no-op, so it is safe to run
  // repeatedly on the same content.
  function createConverter(locales = [], pageLanguage = '') {
    const months = monthNames(locales).join('|');
    const dateRules = buildDateRules(months);
    const monthBefore = new RegExp(
      String.raw`${WORD_START}(?:${months})\.?,?\s+(?:${DAY_NAME}(?:\s?[-–]\s?${DAY_NAME})?[.,]?\s+)?(?:(?:de|del|di|of)\s+)?$`,
      'iu',
    );
    const language = {
      monthBefore,
      nounsCapitalised: NOUNS_CAPITALISED.includes(String(pageLanguage).toLowerCase().split('-')[0]),
    };
    return function convert(text, options = {}) {
      let count = 0;
      for (const rule of dateRules) {
        text = text.replace(rule, (...args) => {
          const groups = args[args.length - 1];
          count++;
          return (groups.pre ?? '') + String(Number(groups.year) + 10000);
        });
      }
      const bare = convertBareYears(text, options, language);
      return { text: bare.text, count: count + bare.count };
    };
  }

  // What a table header says about the numbers below it.
  const DATE_HEADER = new RegExp(String.raw`${WORD_START}(?:${anyOf('dateHeader')})${WORD_END}`, 'iu');
  const QUANTITY_HEADER = new RegExp(
    String.raw`${WORD_START}(?:${anyOf('quantityHeader')})${WORD_END}`,
    'iu',
  );

  function classifyHeader(text) {
    const date = DATE_HEADER.test(text);
    const quantity = QUANTITY_HEADER.test(text);
    if (date === quantity) return null;
    return date ? 'date' : 'quantity';
  }

  const api = { createConverter, classifyHeader };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Year12000 = api;
})(globalThis);
