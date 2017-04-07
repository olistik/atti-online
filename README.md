# Fetches documents and meta data

## Requirements

- Git (tested on `2.10.1`)
- NodeJS (tested on `v6.7.0`)
- NPM (tested on `3.10.7`)

## Setup

Clone this repository:

```
git clone https://github.com/olistik/atti-online.git
```

Enter into the working directory:

```
cd atti-online
```

Install the dependencies (CasperJS):

```
npm install
```

Now tweak the hardcoded values within `fetch.js`:

- `address`
- `label`

And then run the script:

```
./node_modules/casperjs/bin/casperjs fetch.js
```

At the end, if everything went well, you should see a `documents/` directory and a `records.json` database in the current directory.

## Parameters

`address`: `"http://www.e-desio.it/ULISS-e/utility/info/info01.aspx?pagina=ATTI&men_id=00.03"`

### Label

- `"Delibere di Giunta"`
- `"Delibere di Consiglio"`
- `"Determine dei dirigenti"`

```
var searchParams = {
  year: "2016",
  range: {
    start: "1",
    end: "500"
  }
};
var documentsBasePath = "documents";
```

## Batch

For some unknown reasons, attachments are not retrieved when the range is too high (1-250).

For this reason I've prepared a script that chains batches together:

```
./batch.sh
```

It currently performs 10 batches each covering the fetch of 50 records therefore covering a total amount of 500 records.

## License

This project is licensed under the AGPLv3.
