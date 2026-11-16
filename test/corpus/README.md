# Corpus

Real text, labelled by hand, used to measure how well the date rules work outside the examples they were written for.

Each `.txt` file is the opening of a Wikipedia article. Years are wrapped in braces, like `{1969}`; every other number is left as it is. The file name starts with the language code.

```sh
npm run corpus   # accuracy per file, with every missed year and every wrongly converted number
```

`test/unit/corpus.test.js` fails when overall precision drops below 98% or recall below 95%.

## Adding an article

```sh
node scripts/fetch-corpus.js it "Cortina d'Ampezzo"
```

The script marks every number from 1000 to 2099 as a year. That is only a first guess: read the file, remove the braces from the numbers that are not years (heights, distances, counts), then change the `# Labels:` line from `UNREVIEWED` to `reviewed`.

Measure before changing any rule. Articles added after a rule change are the honest test of it.

## Limits

The corpus is encyclopedia prose, where most four-digit numbers really are years. It says little about shops, dashboards or forums, and it tests plain text only, not page structure (that is what `test/e2e` is for).

## Licence

The article text is by Wikipedia contributors and is used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The source of each file is in its first line. The braces are the only change.
