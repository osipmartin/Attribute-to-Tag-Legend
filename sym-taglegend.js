window.PIVisualization = window.PIVisualization || {};
(function (PV) {
	'use strict';
	
	function symbolVis() { }
	PV.deriveVisualizationFromBase(symbolVis);
	
	var _piwebapiurl  = PV.ClientSettings.PIWebAPIUrl.replace(/\/?$/, '/'); 
	$('head').append('<link rel="stylesheet" type="text/css" href="Scripts/app/editor/symbols/ext/css/sym-taglegend-style.css">');	
	
	symbolVis.prototype.init = function (scope, elem, displayProvider){	
		scope.items = [];
	
		// check if there are new attributes to be added every 10 seconds (10000ms)
		// alternatively, you can have symbols register with the legend (but you would have to change the symbol model)
		setInterval(function() { 
			scope.UpdateLegend();
		}, 10000);	
		
		scope.UpdateLegend = function(){
			var i = 0;
			var sym = displayProvider.getSymbolByName("Symbol"+i);
			var attributes = new Set();
			
			// loop through all the symbols and extract the unique attributes being used
			while(sym){
				if(sym.Name !== scope.symbol.Name){
					sym.DataSources.forEach(function(a){
						if(a.slice(0,3) === "af:"){
							attributes.add(a.slice(3));
						}						
					});
				}
				i++;
				sym = displayProvider.getSymbolByName("Symbol"+i);
			}
			
			// only make requests for attributes that aren't already in the table
			var newAttributes = [...attributes].filter( a => {
				return scope.items.every( i => i.Attribute !== a );
			});
			
			if(newAttributes.length > 0) {
				// make a batch request to the pi web api
				var request = constructRequest(newAttributes);
				$.ajax({
					url: `${_piwebapiurl}batch`,
					type: "POST",		
					contentType: "application/json",				
					data: request,			
					xhrFields: {
					  withCredentials: true
					}
				})
				.done(function(data, textStatus, xhr){
					for(var i = 0; i < newAttributes.length; i++ ){
						// if we received a valid response, add the attribute and tag pair to our items array
						if(data[i].Status === 200){
							scope.items.push({
								Attribute: newAttributes[i],
								Tag: data[i].Content.Name
							});
						}
					}
				});
			}
		}
		
		scope.UpdateLegend();
		
		function constructRequest(attributes){
			var request = "{";
			attributes.forEach(function(a,i){
				a = a.replace(/\\/g,'\\\\');
				request +=
				`
					"path${i}" : {
						"Method": "GET",
						"Resource": "${_piwebapiurl}attributes?path=${a}"
					},
					"${i}" : {
						"Method": "GET",
						"Resource": "$.path${i}.Content.Links.Point",
						"ParentIds": [
							"path${i}"
						]
					},
				`
			});
			request += "}";
			return request;
		}
	}
	
	var def = {
		typeName: 'taglegend',
		displayName: 'Tag Legend',
		datasourceBehavior: PV.Extensibility.Enums.DatasourceBehaviors.Single,
		iconUrl: 'Scripts/app/editor/symbols/ext/Icons/compassrose.png',
		visObjectType: symbolVis,
		inject: ['displayProvider'],
		getDefaultConfig: function(){
			return{
				DataShape: 'Value',
				Height: 300,
				Width: 300,
			};
		}
	};
	
	PV.symbolCatalog.register(def);
})(window.PIVisualization);