import geoJson from './line.js';
(function(){
  mapboxgl.accessToken = 'pk.eyJ1IjoiZGlwc2F1c2Rlbm5pcyIsImEiOiJjamVlYTh3MGMyNHY2MzNwcjgwbzk0djIzIn0.QofxX1NoR0uUsqFzcrONmw';
  const sparqlQuery = `SELECT ?item ?itemLabel ?coords ?nstation ?lijn ?lijnLabel
WHERE
{
?item wdt:P31 wd:Q928830.
?item wdt:P625 ?coords .
?item p:P197 ?nstation .
?nstation pq:P81 ?lijn .
SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
FILTER(?lijn IN ( wd:Q2466115, wd:Q2163442, wd:Q606629, wd:Q2183200, wd:Q2466111))
}`;
  const app = {
    init: function(){
      metroData.init();
      mapObj.onLoad();
      googleLocation.load();
    }
  };

  const mapObj = {
    map: new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v9',
      zoom: 11,
      center: [4.955556, 52.332778],
      pitch: 0,
      bearing: 0,
    }),
    addMarker: function(data, className){
      let name = 'marker';
      if(className){
        name += ' ' + className;
      }
      let init = false;
      data.forEach(function(marker) {
        var el = document.createElement('div');
        el.className = (name);
        new mapboxgl.Marker(el)
          .setLngLat(marker.location.geometry.coordinates)
          .addTo(mapObj.map);
      });
    },
    onLoad: function(){
      mapObj.map.on('load', function(){
        mapObj.map.addControl(new mapboxgl.NavigationControl());
        mapObj.map.flyTo({
          center: [4.895168, 52.370216],
          zoom: 12,
          bearing: -20,
          speed: 0.2,
          pitch: 60,
          curve: 1,
        });
      });
    },
    drawLine: function(data){
      mapObj.map.on('load', function(){
        for(let i = 0; i < data.length; i++){
          // mapObj.map.addLayer({
          //   'type': 'line',
          //   'source': {
          //     'type': 'geojson',
          //     'data': data[i]
          //   },
          //   'layout': {
          //     'line-cap': 'round',
          //     'line-join': 'round'
          //   },
          //   'paint': {
          //     'line-color': '#ed6498',
          //     'line-width': 5,
          //     'line-opacity': .8
          //   }
          // });
        }
      });
    }
  };

  const metroData = {
    init: function(){
      //get data and map data
      this.getData().then(metroData.mapData.init);
    },
    getData: function(){
      const endpointUrl = 'https://query.wikidata.org/sparql';
      const fullUrl = endpointUrl + '?query=' + encodeURIComponent( sparqlQuery );
      const headers = { 'Accept': 'application/sparql-results+json' };
      return fetch( fullUrl, { headers } ).then(response => response.json());
    },
    mapData: {
      init: function(data) {
        const self = metroData.mapData;
        //get mapdata and map the data
        const allMetroStations = self.groupData(self.createGEOJSON(data));
        const allLines = self.createLineObject(allMetroStations);
        //set data into variable and push data on to the map after this
        metroData.metroLines = allLines;
        metroData.metroStations = allMetroStations;
        const newGeoJson = geoJson.features.filter(function(e){
          const valuesArr = ['Metrolijn 54', 'Metrolijn 53', 'Noord/Zuidlijn', 'metro/sneltramlijn 51', 'Metrolijn 50'];
          return valuesArr.includes(e.properties.linelabel);
        });
        mapObj.drawLine(newGeoJson);
        mapObj.addMarker(allMetroStations);
      },
      createGEOJSON: function(data){
        let newData = data.results.bindings.map(function(el){
          let oldPoint = el.coords.value;
          let point = oldPoint.split('Point(');
          point = point[1].split(')');
          let xCord = point[0].split(' ');
          let yCord = xCord[1];
          xCord = xCord[0];
          let lijnLabel;
          switch (el.lijnLabel.value) {
            case 'metro/fast tram line 51':
              lijnLabel = 51;
              break;
            case 'Geinlijn':
              lijnLabel = 54;
              break;
            case 'Gaasperplaslijn':
              lijnLabel = 53;
              break;
            case 'Noord/Zuidlijn':
              lijnLabel = 52  ;
              break;
            case 'Ringlijn':
              lijnLabel = 50  ;
              break;
          }
          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [xCord, yCord],
            },
            properties: {
              lijnlabel: lijnLabel,
              metroHalte: el.itemLabel.value,
            }
          };
        });
        return newData;
      },
      groupData: function(data){
        let groupBy = function(xs, key){
          return xs.reduce(function(rv, x) {
            (rv[x.properties[key]] = rv[x.properties[key]] || []).push(x);
            return rv;
          }, {});
        };
        let allMetroStation = groupBy(data, 'metroHalte');
        let newArray = [];
        for (var key in allMetroStation) {
          var arr = [];
          allMetroStation[key].forEach(function(item){
            //hier later wat anders op verzinnen, niet volledige support
            if(!arr.includes(item.properties.lijnlabel)){
              arr.push(item.properties.lijnlabel);
            }
          });
          var object = {
            metroHalte: key,
            metroLijnen: arr,
            location: allMetroStation[key][0]
          };
          newArray.push(object);
        }
        return newArray;
      },
      filterOnLine: function (data, lijnNr){
        return data.filter(function(item){
          return item.metroLijnen.includes(lijnNr);
        });
      },
      createLineObject: function(data){
        const self = metroData.mapData;
        const lijn51 = self.orderLines(self.filterOnLine(data, 51), 51);
        const lijn50 = self.orderLines(self.filterOnLine(data, 50), 50);
        const lijn52 = self.orderLines(self.filterOnLine(data, 52), 52);
        const lijn53 = self.orderLines(self.filterOnLine(data, 53), 53);
        const lijn54 = self.orderLines(self.filterOnLine(data, 54), 54);
        const allLines = {
          51: lijn51,
          52: lijn52,
          53: lijn53,
          50: lijn50,
          54: lijn54
        };
        return allLines;
      },
      orderLines: function(data, nr){
        let currentData = data;
        let lengthOfData = data.length;
        let newArray = [];
        let firstStop = '';
        switch (nr) {
          case 52:
            firstStop = 'Noord metro station';
            break;
          case 51:
            firstStop = 'Westwijk';
            break;
          case 54:
            firstStop = 'Amsterdam Centraal';
            break;
          case 50:
            firstStop = 'Gein';
            break;
          case 53:
            firstStop = 'Amsterdam Centraal';
            break;
        }

        //get first stop out of data to filter the data
        for(let i = 0; i < currentData.length; i++){
          if(currentData[i].metroHalte == firstStop){
            newArray.push(currentData[i]);
            currentData.splice(i, 1);
            break;
          }
        }

        function loopFunction(){
          function actualLoop(){
            let arrayTest = [];
            let firstStationPoints = newArray[newArray.length - 1].location.geometry.coordinates;
            for(let i = 0; i < currentData.length; i++){
              let distanceNr = routePlanner.distanceTwoPoints(currentData[i], firstStationPoints[1], firstStationPoints[0], currentData[i].location.geometry.coordinates[1] , currentData[i].location.geometry.coordinates[0]);
              let obj = {
                index: i,
                object: currentData[i],
                distance: distanceNr.distance
              };
              arrayTest.push(obj);
            }
            let lowestDistance = routePlanner.getLowestNumber(arrayTest);
            lowestDistance = lowestDistance.object.metroHalte;
            let lowestDistanceNr;
            for(let i = 0; i < currentData.length; i++){
              if(lowestDistance == currentData[i].metroHalte){
                lowestDistanceNr = i;
                break;
              }
            }
            newArray.push(currentData[lowestDistanceNr]);
            currentData.splice(lowestDistanceNr, 1);
          }
          if(lengthOfData !== newArray.length){
            actualLoop();
            loopFunction();
          }
        }
        //loop trough data, check distance with next stop so we can filter it
        loopFunction();
        return newArray;
      }
    },
    metroLines: [],
    metroStations: [],
  };

  const googleLocation = {
    load: function (){
      var timeout = null;
      let inputElements = document.querySelectorAll('input[type="text"]');
      inputElements.forEach(function(el){
        el.addEventListener('keyup', function(input){
          let self = googleLocation;
          let classNameElement = input.target.classList[0];
          var result = input.target.value;
          clearTimeout(timeout);
          timeout = setTimeout(function () {
            if(result){
              result = result.split(' ').join('+') + ', Nederland';
              googleLocation.getData(result).then(self.suggestion.bind(null, classNameElement));
            }
            else{
              switch (classNameElement) {
                case 'start':
                  self.firstLocation = '';
                  break;
                case 'end':
                  self.secondLocation = '';
                  break;
              }
              let classNameSearch = '.results.' + classNameElement;
              let searchResults = document.querySelector(classNameSearch);
              searchResults.innerHTML = '';
            }
          }, 300);
        });
      });
      let submitButton = document.querySelector('form');
      submitButton.addEventListener('submit', function(el){
        var self = googleLocation;
        el.preventDefault();
        if(self.firstLocation == ''){
          if(!document.querySelector('input.start').value){
            console.log('eerste input is leeg');
          }
          else{
            self.firstLocation = document.querySelector('input.start').value;
          }
        }
        else if(self.secondLocation == ''){
          if(!document.querySelector('input.end').value){
            console.log('tweede input is leeg');
          }
          else{
            self.secondLocation = document.querySelector('input.end').value;
          }
        }
        else{
          //er zijn 2 adressen bekend. lets go calculate some shit.
          routePlanner.init(self.firstLocation, self.secondLocation);
        }
      });
      let changeInputs = document.querySelector('.switchInputFields');
      changeInputs.addEventListener('click', function(el){
        el.preventDefault();
        let self = googleLocation;
        let topValue = document.querySelector('input.start').value;
        let bottomValue = document.querySelector('input.end').value;
        self.firstLocation = bottomValue;
        self.secondLocation = topValue;
        document.querySelector('input.start').value = bottomValue;
        document.querySelector('input.end').value = topValue;
      });
    },
    getData: function(result){
      let url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + result + '&key=AIzaSyCHRzuIAtoPNHLj5MyY_KFn0Ls8mBlUyPg';
      var promiseObj = new Promise(function(resolve, reject){
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.send();
        request.responseType = 'json';
        request.onload = function(){
          if (request.status == 200) {
            resolve(request.response);
          }
          else{
            reject(Error(request.statusText));
          }
        };
        request.onerror = function() {
          reject(Error('Network Error'));
        };
      });
      return promiseObj;
    },
    suggestion: function(className, data){
      var self = googleLocation;
      let results = data.results;
      let classNameSearch = '.results.' + className;
      let searchResults = document.querySelector(classNameSearch);
      searchResults.innerHTML = '';
      results.forEach(function(el){
        let a = document.createElement('a');
        let text = document.createTextNode(el.formatted_address);
        a.appendChild(text);
        a.className = className;
        a.href = '#';
        a.addEventListener('click', self.suggestionClicked);
        searchResults.appendChild(a);
      });
    },
    firstLocation: '',
    secondLocation: '',
    suggestionClicked: function(el){
      el.preventDefault();
      let self = googleLocation;
      let className = el.target.classList[0];
      let inputField = document.querySelector(('input.' + className));
      let resultField = document.querySelector(('.results.' + className));
      let textValue = el.target.text;
      resultField.innerHTML = '';
      inputField.value= textValue;
      switch (className) {
        case 'start':
          self.firstLocation = textValue;
          document.querySelector('input.end').focus();
          break;
        case 'end':
          self.secondLocation = textValue;
          document.querySelector('input[type="submit"]').focus();
          break;
      }
    }
  };

  const routePlanner = {
    init: function(startLocation, endLocation){
      const startLocationGeo = googleLocation.getData(startLocation);
      const endLocationGeo = googleLocation.getData(endLocation);
      var self = this;
      Promise.all([startLocationGeo, endLocationGeo]).then(function(data){
        const subwayStations = metroData.metroStations;
        let firstSubway = [];
        let secondSubway = [];
        subwayStations.forEach(function(el){
          let curr = self.distanceTwoPoints(el, data[0].results[0].geometry.location.lat, data[0].results[0].geometry.location.lng, el.location.geometry.coordinates[1], el.location.geometry.coordinates[0]);
          firstSubway.push(curr);
        });
        subwayStations.forEach(function(el){
          let curr = self.distanceTwoPoints(el, data[1].results[0].geometry.location.lat, data[1].results[0].geometry.location.lng, el.location.geometry.coordinates[1], el.location.geometry.coordinates[0]);
          secondSubway.push(curr);
        });
        firstSubway = self.getLowestNumber(firstSubway);
        secondSubway = self.getLowestNumber(secondSubway);
        self.findRoute(firstSubway, secondSubway);
      });
    },
    getLowestNumber: function(object){
      var lowestNr = Number.POSITIVE_INFINITY;
      var lowestOb = [];
      object.forEach(function(item){
        if(lowestNr > item.distance){
          lowestOb = [];
          lowestOb.push(item);
          lowestNr = item.distance;
        }
      });
      return lowestOb[0];
    },
    degreesToRadians: function(degree){
      return degree * Math.PI / 180;
    },
    distanceTwoPoints(object, lat1, lon1, lat2, lon2){
      var self = routePlanner;
      let earthRadiusKm = 6371;
      let dLat = self.degreesToRadians(lat2-lat1);
      let dLon = self.degreesToRadians(lon2-lon1);
      lat1 = self.degreesToRadians(lat1);
      lat2 = self.degreesToRadians(lat2);
      let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
      let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return {
        distance: (earthRadiusKm * c),
        object: object
      };
    },
    beginStationName: '',
    endStationName: '',
    findRoute: function(firstStation, secondStation){
      var self = routePlanner;
      self.beginStationName = firstStation.object.metroHalte;
      self.endStationName = secondStation.object.metroHalte;
      let directRouteVar = false;
      if(self.beginStationName == self.endStationName){
        //begin is same as end, find something funny here
        alert('ga lopen');
      }
      else{
        //start planning
        let firstStationLines = firstStation.object.metroLijnen;
        let secondStationLines = secondStation.object.metroLijnen;
        //check if it is a directRoute
        let firstStationStop = [];
        let endStations = [];
        let endStationStop = [];
        firstStationLines.forEach(function(el){
          let firstLine = el;
          secondStationLines.forEach(function(line){
            if(firstLine == line){
              // there is a direct line start a new function here
              var activeMetroLine = metroData.metroLines[firstLine];
              directRouteVar = true;
              endStations.push(self.directRoutePlanning(activeMetroLine, firstLine, firstStation.object.metroHalte, secondStation.object.metroHalte));
            }
          });
        });
        let tussenStop = [];
        let tussenLines = [];
        if(!directRouteVar){
          firstStationLines.forEach(function(el){
            let firstLine = el;
            let activeMetroLine = metroData.metroLines[firstLine];
            activeMetroLine.forEach(function(item){
              let thisLine = item.metroLijnen;
              thisLine.forEach(function(line){
                let currLine = line;
                secondStationLines.forEach(function(endLine){
                  if(endLine === currLine){
                    if(!tussenLines.includes(endLine)){
                      tussenLines.push(endLine);
                    }
                    tussenStop.push(item);
                  }
                });
              });
            });
          });
          firstStationLines.forEach(function(fLine){
            let beginLine = fLine;
            tussenStop.forEach(function(sLine){
              let tLine = sLine.metroLijnen;
              let sLineCurr = sLine;
              tLine.forEach(function(line){
                if(line === beginLine){
                  firstStationStop.push(self.directRoutePlanning(metroData.metroLines[beginLine], beginLine, firstStation.object.metroHalte, sLineCurr.metroHalte));
                }
              });
            });
          });
          secondStationLines.forEach(function(fLine){
            let beginLine = fLine;
            tussenStop.forEach(function(sLine){
              let tLine = sLine.metroLijnen;
              let sLineCurr = sLine;
              tLine.forEach(function(line){
                if(line === beginLine){
                  endStationStop.push(self.directRoutePlanning(metroData.metroLines[beginLine], beginLine, sLineCurr.metroHalte, secondStation.object.metroHalte));
                }
              });
            });
          });
        }
        let newEndstation = [];
        let withStopStations = [];
        if(!directRouteVar){
          endStationStop.forEach(function(item){
            let station = item.obj[0];
            firstStationStop.forEach(function(el){
              if((el.obj[el.obj.length - 1]) == station){
                let currData = {
                  begin: el,
                  end: item,
                  stops: (el.obj.length + item.obj.length)
                };
                withStopStations.push(currData);
              }
            });
          });
          let length = 10000;
          withStopStations.forEach(function(item){
            if(item.stops < length){
              newEndstation = [];
              length = item.stops;
              newEndstation.push(item);
            }
          });
        }
        else{
          if(endStations.length > 0){
            let length = 1000;
            for(let i = 0; i < endStations.length; i++){
              if(endStations[i].obj.length < length){
                newEndstation = [];
                length = endStations[i].obj.length;
                newEndstation.push(endStations[i]);
              }
            }
          }
        }
        self.placeRoute(newEndstation, directRouteVar);
      }
    },
    directRoutePlanning: function(line, lineNr, beginStation, endStation){
      let activeMetroLine = line;
      let stationsPassing = [];
      let beginStationNameCurr = beginStation;
      let endStationNameCurr = endStation;
      let indexAfter = Number.POSITIVE_INFINITY;
      for(let i = 0; i < activeMetroLine.length; i++){
        if(activeMetroLine[i].metroHalte == beginStationNameCurr){
          indexAfter = i;
        }
        if(i >= indexAfter){
          stationsPassing.push(activeMetroLine[i]);
          if(activeMetroLine[i].metroHalte == endStationNameCurr){
            break;
          }
        }
      }
      let firstWay = false;
      stationsPassing.forEach(function(station){
        if(station.metroHalte == endStationNameCurr){
          firstWay = true;
        }
      });
      if(!firstWay){
        stationsPassing = [];
        indexAfter = Number.NEGATIVE_INFINITY;
        for(let i = activeMetroLine.length; i > 0; i--){
          if(activeMetroLine[i - 1].metroHalte == beginStationNameCurr){
            indexAfter = i;
          }
          if(i <= indexAfter){
            stationsPassing.push(activeMetroLine[i - 1]);
            if(activeMetroLine[i - 1].metroHalte == endStationNameCurr){
              break;
            }
          }
        }
      }
      let directRouteObj = {
        line: lineNr,
        obj: stationsPassing
      };
      return directRouteObj;
    },
    placeRoute: function (data, direct){
      let el1 = document.querySelector('.planner');
      el1.classList.add('active');
      let legendaFirst = document.querySelector('.legenda');
      legendaFirst.classList.add('inactive');
      let legendaSecond = document.querySelector('.legendaActive');
      legendaSecond.classList.remove('inactive');

      let el2 = document.querySelector('.eindResults');
      el2.classList.add('active');
      let newData = [];
      if(direct){
        let arr = data[0].obj;
        let newArr = [];
        for(let i = 1; i < (arr.length - 1); i++){
          newArr.push(arr[i].metroHalte);
        }
        let obj = {
          fromTo: [data[0].obj[0], data[0].obj[data[0].obj.length - 1]],
          line: data[0].line,
          firstLi: data[0].obj[0].metroHalte,
          lastLi: data[0].obj[data[0].obj.length - 1].metroHalte,
          betweenStops: newArr,
        };
        newData.push(obj);
      }
      else{
        let arr1 = data[0].begin.obj;
        let newArr1 = [];
        for(let i = 1; i < (arr1.length - 1); i++){
          newArr1.push(arr1[i].metroHalte);
        }
        let objBegin = {
          fromTo: [data[0].begin.obj[0], data[0].begin.obj[data[0].begin.obj.length - 1]],
          line: data[0].begin.line,
          firstLi: data[0].begin.obj[0].metroHalte,
          lastLi: data[0].begin.obj[data[0].begin.obj.length - 1].metroHalte,
          betweenStops: newArr1,
        };
        newData.push(objBegin);
        let arr2 = data[0].end.obj;
        let newArr2 = [];
        for(let i = 1; i < (arr2.length - 1); i++){
          newArr2.push(arr2[i].metroHalte);
        }
        let objEnd = {
          fromTo: [data[0].end.obj[0], data[0].end.obj[data[0].end.obj.length - 1]],
          line: data[0].end.line,
          firstLi: data[0].end.obj[0].metroHalte,
          lastLi: data[0].end.obj[data[0].end.obj.length - 1].metroHalte,
          betweenStops: newArr2,
        };
        newData.push(objEnd);
      }
      let geoLoc;
      let geoLocEnd;
      let geoLocBetween = [];
      if(direct){
        geoLoc = data[0].obj[0].location.geometry.coordinates;
        geoLocEnd = data[0].obj[data[0].obj.length - 1].location.geometry.coordinates;
        for(let o = 1; o < data[0].obj.length - 1; o++){
          geoLocBetween.push(data[0].obj[o].location.geometry);
        }
      }
      else{
        geoLoc = data[0].begin.obj[0].location.geometry.coordinates;
        geoLocEnd = data[0].end.obj[data[0].end.obj.length - 1].location.geometry.coordinates;
        for(let o = 1; o < data[0].begin.obj.length - 1; o++){
          geoLocBetween.push(data[0].begin.obj[o].location.geometry);
        }
        for(let i = 1; i < data[0].end.obj.length - 1; i++){
          geoLocBetween.push(data[0].end.obj[i].location.geometry);
        }
        let geoLocBetweenStop = data[0].end.obj[0].location.geometry.coordinates;
        var elBetweenStop = document.createElement('div');
        elBetweenStop.className = 'marker overstopPoint';
        new mapboxgl.Marker(elBetweenStop)
          .setLngLat(geoLocBetweenStop)
          .addTo(mapObj.map);
      }
      for (let i = 0; i < geoLocBetween.length; i++){
        var elBetween = document.createElement('div');
        elBetween.className = 'marker tussen';
        new mapboxgl.Marker(elBetween)
          .setLngLat(geoLocBetween[i].coordinates)
          .addTo(mapObj.map);

      }
      mapObj.map.flyTo({
        center: geoLoc
      });
      let main = document.querySelector('main');
      main.classList.add('searched');
      let mapFocus = document.querySelector('.mapboxgl-canvas');
      mapFocus.focus();
      var el = document.createElement('div');
      el.className = 'marker startpoint';
      new mapboxgl.Marker(el)
        .setLngLat(geoLoc)
        .addTo(mapObj.map);

      var elEnd = document.createElement('div');
      elEnd.className = 'marker endPoint';
      new mapboxgl.Marker(elEnd)
        .setLngLat(geoLocEnd)
        .addTo(mapObj.map);

      routePlanner.templateRender(newData);
    },
    templateRender: function(data){
      let element = document.querySelector('.eindResults');
      element.innerHTML = '';
      let direct = true;
      if(data.length > 1){
        direct = false;
      }
      //create top div
      let elementPlacedOn = document.createElement('div');

      //create title
      let titleAbove = document.createElement('h1');
      let titleAboveText = document.createTextNode('Routeplanner metro Amsterdam');
      titleAbove.appendChild(titleAboveText);

      //from to (place title route on end)
      let tilteRoute = document.createElement('h3');
      let titleRouteText = document.createTextNode('Route van: ');
      tilteRoute.appendChild(titleRouteText);

      let spanTitle = document.createElement('span');
      spanTitle.className = 'start_adress';
      let spanTitleText;
      if(direct){
        spanTitleText = document.createTextNode(data[0].fromTo[0].metroHalte);
      }else{
        spanTitleText = document.createTextNode(data[0].fromTo[0].metroHalte);
      }
      spanTitle.appendChild(spanTitleText);

      tilteRoute.appendChild(spanTitle);
      let spanTitleEnd = document.createElement('span');
      spanTitleEnd.className = 'end_adres';
      let tussenText = document.createTextNode(' naar ');
      tilteRoute.appendChild(tussenText);

      let spanTitleEndText;
      if(direct){
        spanTitleEndText = document.createTextNode(data[0].fromTo[1].metroHalte);
      }
      else{
        spanTitleEndText = document.createTextNode(data[1].fromTo[1].metroHalte);
      }
      spanTitleEnd.appendChild(spanTitleEndText);
      tilteRoute.appendChild(spanTitleEnd);


      let link = document.createElement('a');
      link.className = 'result_container';
      let linkText = document.createTextNode('Toon tussenstops');
      link.href = '#';
      link.onclick = function(e){
        e.preventDefault();
        let menuOpen = document.querySelectorAll('.stops_between');
        menuOpen.forEach(function(el){
          if(el.classList.contains('inactive')){
            el.classList.remove('inactive');
          }else{
            el.classList.add('inactive');
          }
        });
      };
      link.appendChild(linkText);


      let singleResult;
      elementPlacedOn.appendChild(titleAbove);
      elementPlacedOn.appendChild(tilteRoute);
      if(direct){
        //for loop difference
        singleResult = document.createElement('div');
        singleResult.className = 'singleResult';
        let result_container = document.createElement('div');
        result_container.className = 'result_container';
        let title = document.createElement('h4');
        let titleText = document.createTextNode('Metro ');

        //wich line is it
        let titleLine = document.createElement('span');
        let titleLineText = document.createTextNode(data[0].line);
        title.appendChild(titleText);
        titleLine.appendChild(titleLineText);
        title.appendChild(titleLine);

        let uList = document.createElement('ul');
        uList.className = 'stops';

        let firstLi = document.createElement('li');
        let firstLiText = document.createTextNode(data[0].firstLi);
        firstLi.append(firstLiText);

        let stopsBetween = document.createElement('div');
        stopsBetween.className = 'stops_between inactive';
        let stopsBetweenUl = document.createElement('ul');
        stopsBetweenUl.className = 'stops';
        stopsBetween.appendChild(stopsBetweenUl);

        for(let i = 0; i < (data[0].betweenStops.length); i++){
          let li = document.createElement('li');
          let text = document.createTextNode(data[0].betweenStops[i]);
          li.appendChild(text);
          stopsBetweenUl.appendChild(li);
        }
        stopsBetween.appendChild(stopsBetweenUl);
        uList.appendChild(stopsBetween);

        let lastLi = document.createElement('li');
        let lastLiText = document.createTextNode(data[0].lastLi);
        lastLi.appendChild(lastLiText);

        uList.appendChild(firstLi);
        stopsBetween.appendChild(stopsBetweenUl);
        uList.appendChild(stopsBetween);
        uList.appendChild(lastLi);
        result_container.appendChild(title);
        result_container.appendChild(uList);
        singleResult.appendChild(result_container);

        elementPlacedOn.appendChild(singleResult);

      }
      else{
        for(let k = 0; k < 2; k++){
          singleResult = document.createElement('div');
          singleResult.className = 'singleResult';
          let result_container = document.createElement('div');
          result_container.className = 'result_container';
          let title = document.createElement('h4');
          let titleText = document.createTextNode('Metro ');

          //wich line is it
          let titleLine = document.createElement('span');
          let titleLineText = document.createTextNode(data[k].line);
          title.appendChild(titleText);
          titleLine.appendChild(titleLineText);
          title.appendChild(titleLine);

          let uList = document.createElement('ul');
          uList.className = 'stops';

          let firstLi = document.createElement('li');
          let firstLiText = document.createTextNode(data[k].firstLi);
          firstLi.append(firstLiText);

          let stopsBetween = document.createElement('div');
          stopsBetween.className = 'stops_between inactive';
          let stopsBetweenUl = document.createElement('ul');
          stopsBetweenUl.className = 'stops';
          stopsBetween.appendChild(stopsBetweenUl);

          for(let i = 0; i < (data[k].betweenStops.length); i++){
            let li = document.createElement('li');
            let text = document.createTextNode(data[k].betweenStops[i]);
            li.appendChild(text);
            stopsBetweenUl.appendChild(li);
          }
          stopsBetween.appendChild(stopsBetweenUl);
          uList.appendChild(stopsBetween);

          let lastLi = document.createElement('li');
          let lastLiText = document.createTextNode(data[k].lastLi);
          lastLi.appendChild(lastLiText);

          uList.appendChild(firstLi);
          stopsBetween.appendChild(stopsBetweenUl);
          uList.appendChild(stopsBetween);
          uList.appendChild(lastLi);
          result_container.appendChild(title);
          result_container.appendChild(uList);
          singleResult.appendChild(result_container);

          elementPlacedOn.appendChild(singleResult);
        }
      }
      elementPlacedOn.appendChild(link);
      element.appendChild(elementPlacedOn);
    }
  };

  app.init();
})();
