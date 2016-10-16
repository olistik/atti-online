var casper = require("casper").create();
var fs = require('fs');

if (!casper.cli.has("label") || !casper.cli.has("year")) {
  casper.echo("pass year and label").exit();
}

// this has been hardcoded
var address = "http://www.e-desio.it/ULISS-e/utility/info/info01.aspx?pagina=ATTI&men_id=00.03";

var label = casper.cli.get("label"); // "Delibere di Giunta"
var searchParams = {
  year: casper.cli.get("year"),
  range: {
    start: "1",
    end: "500"
  }
};

if (casper.cli.has("start")) {
  searchParams.range.start = casper.cli.get("start");
}
if (casper.cli.has("end")) {
  searchParams.range.end = casper.cli.get("end");
}

var documentsBasePath = "bundles/" + label + "/" + searchParams.year;
if (!fs.exists(documentsBasePath)) {
  fs.makeDirectory(documentsBasePath);
}

var records = [];

function saveResults() {
  var path = "database.json";
  casper.echo("Writing results to " + path);
  var database = null;
  if (fs.exists(path)) {
    database = JSON.parse(fs.read(path));
  } else {
    database = {};
  }
  if (database[label] === undefined) { database[label] = {}; }
  if (database[label][searchParams.year] === undefined) { database[label][searchParams.year] = {}; }
  for (var i = 0; i < records.length; ++i) {
    database[label][searchParams.year][records[i].number] = records[i];
  }
  fs.write(path, JSON.stringify(database), "w");
}

function getRowRecords() {
  var rows = document.querySelectorAll("#tbl_dett tr");
  var list = [];
  for (var i = 1; i < rows.length; ++i) {
    var row = rows[i];
    var rowRecord = {
      row: row,
      year: row.querySelectorAll("td span")[0].innerHTML,
      number: row.querySelectorAll("td span")[1].innerHTML,
      author: row.querySelectorAll("td span")[2].innerHTML,
      subject: row.querySelectorAll("td span")[3].innerHTML,
      startingPublicationDate: row.querySelectorAll("td span")[4].innerHTML,
      endingPublicationDate: row.querySelectorAll("td span")[5].innerHTML,
      executionDate: row.querySelectorAll("td span")[6].innerHTML,
      documents: null
    };
    list.push(rowRecord);
  }
  return list;
};

function scrapeDeepRecord(index) {
  var record = records[index];
  if (record.documents.deepLink) {
    var url = record.documents.result;
    casper.thenOpen(url, function() {
      this.echo("Loaded url: " + url);
      this.echo("Waiting for page to load..");
      this.waitForSelector(".btn-enabled-Stm", function() {
        this.echo("Page loaded");
        var list = this.evaluate(function() {
          var rows = document.querySelectorAll("#tbl_dett tr");
          var list = [];
          for (var i = 1; i < rows.length; ++i) {
            var row = rows[i];
            var cells = row.querySelectorAll("td");
            var filename = cells[0].querySelector(".spanC").innerHTML;
            var availableLinks = cells[1].querySelectorAll("a");
            var urls = [];
            for (var j = 0; j < availableLinks.length; ++j) {
              var link = availableLinks[j];
              var data = {
                url: null,
                filename: null
              };
              data.url = link.href;
              var iconPath = link.querySelector("img").src;
              var resourceType = iconPath.toLowerCase().match(/.*\/icodoc([a-z0-9]+)\.[a-z0-9]+/)[1];
              var extension = null;
              switch (resourceType) {
                case "p7m":
                  extension = "p7m";
                  break;
                case "acrobat":
                  extension = "pdf";
                  break;
                case "word":
                  extension = "doc";
                  break;
                default:
                  extension = "unknown";
              }
              var regexp = new RegExp(extension, "i");
              if (filename.match(regexp) === null) {
                data.filename = j + "_" + filename + "." + extension;
              } else {
                data.filename = j + "_" + filename;
              }
              list.push(data);
            }
          }
          return list;
        });

        var docs_path = documentsBasePath + "/" + record.number + "_" + record.author;
        if (!fs.exists(docs_path)) {
          fs.makeDirectory(docs_path);
        }
        record.documents.list = [];
        for (var j = 0; j < list.length; ++j) {
          var item = list[j];
          item.fullPath = docs_path + "/" + item.filename;
          this.echo("Downloading " + item.fullPath);
          this.download(item.url, item.fullPath);
          record.documents.list.push(item.fullPath);
        }

        if (index < records.length - 1) {
          scrapeDeepRecord(index  + 1);
        } else {
          saveResults();
        }

      })
    });
  } else {
    if (index < records.length - 1) {
      scrapeDeepRecord(index  + 1);
    } else {
      saveResults();
    }
  }
};

casper.start(address, function() {
  this.echo("Waiting for the page to load");
  this.waitForSelector("#ul00_03_00");
});
casper.then(function() {
  this.echo("Clicking the label: \"" + label + "\"");
  this.clickLabel(label);
});
casper.then(function() {
  this.echo("Waiting for the page to load");
  this.waitForSelector("#anno");
});
casper.then(function() {
  this.echo("Selecting the advanced search");
  this.click("#tipo_ricercaA");
});
casper.then(function() {
  this.echo("Waiting for the page to load");
  this.waitForSelector("#anno1.inpl-enabled");
});
casper.then(function() {
  this.echo("Filling the form");
  var formParams = {
    "anno1": searchParams.year,
    "DaNumero": searchParams.range.start,
    "ANumero": searchParams.range.end
  }
  this.fill("form#coatti01", formParams);
});
casper.then(function() {
  this.echo("Clicking the button");
  this.click("#btn_save");
});
casper.then(function() {
  this.echo("Waiting for the page to load");
  this.waitForSelector("#btn_stp");
});
casper.then(function() {
  this.echo("Collecting records from the page");
  records = this.evaluate(getRowRecords);

  for (var i = 0; i < records.length; ++i) {
    records[i].documents = this.evaluate(function(index) {
      var row = document.querySelectorAll("#tbl_dett tr")[index + 1];
      var cell = row.querySelectorAll("td")[7];
      var deepLink = cell.querySelector(".hrefC");
      if (deepLink) {
        return {
          deepLink: true,
          result: deepLink.href
        };
      } else {
        var isWord = cell.querySelector("a img").src.indexOf("Word") !== -1;
        var extension = isWord ? "doc" : "pdf";
        return {
          deepLink: false,
          url: cell.querySelector("a").href,
          extension: extension
        };
      }
    }, i);
    delete records[i].row;
  }

  for (var i = 0; i < records.length; ++i) {
    var record = records[i];
    if (!record.documents.deepLink) {
      var filename = documentsBasePath + "/document_" + record.year + "-" + record.number + "_" + record.author + "." + record.documents.extension;
      this.echo("Downloading " + filename);
      record.documents.fullPath = filename;
      this.download(record.documents.url, filename);
    }
  }
  this.echo("Done");
});

casper.then(function() {
  scrapeDeepRecord(0);
});

casper.run(function() {
  this.echo("Finished");
  this.exit();
});
