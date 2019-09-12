/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////


// This script file is based on the tutorial:
// https://developer.autodesk.com/en/docs/viewer/v2/tutorials/basic-application/

// var viewerApp;
// var fileName;
// var fileType;
// var options = {};
// var token = '';
// var documentId;


// V7  ---  START
function launchViewer(urn, name, ftype) {
var viewer;
var options = {
   env: 'AutodeskProduction',
   api: 'derivativeV2',  // for models uploaded to EMEA change this option to 'derivativeV2_EU'
   getAccessToken: getForgeToken
};
Autodesk.Viewing.Initializer(options, function() {
   var htmlDiv = document.getElementById('forgeViewer');
   viewer = new Autodesk.Viewing.GuiViewer3D(htmlDiv);
   var startedCode = viewer.start();
   if (startedCode > 0) {
       console.error('Failed to create a Viewer: WebGL not supported.');
       return;
   }
   console.log('Initialization complete, loading a model next...');
   var htmlDiv = document.getElementById('forgeViewer');
   viewer = new Autodesk.Viewing.GuiViewer3D(htmlDiv);
   viewer.start();
   var documentId = 'urn:'+urn;
   Autodesk.Viewing.Document.load(documentId, onDocumentLoadSuccess, onDocumentLoadFailure);
   function onDocumentLoadSuccess(viewerDocument) {
       var defaultModel = viewerDocument.getRoot().getDefaultGeometry();
       viewer.loadDocumentNode(viewerDocument, defaultModel);
   }
   function onDocumentLoadFailure() {
       console.error('Failed fetching Forge manifest');
   }
});
}

function onItemLoadSuccess(_viewer, item) {
  viewer = _viewer;
  viewer.loadExtension('Autodesk.Sample.XLSExtension');  
}

function onItemLoadFail(errorCode) {}

function getForgeToken() {
  jQuery.ajax({
    url: '/user/token',
    success: function (res) {
      token = res;
    },
    async: false
  });
  return token;
}
// V7 --- END