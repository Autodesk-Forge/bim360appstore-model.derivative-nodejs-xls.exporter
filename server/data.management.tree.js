// token handling in session
var token = require('./token');

// web framework
var express = require('express');
var router = express.Router();

// forge
var forgeSDK = require('forge-apis');

router.get('/dm/getTreeNode', function (req, res) {
  var tokenSession = new token(req.session);
  if (!tokenSession.isAuthorized()) {
    res.status(401).end('Please login first');
    return;
  }

  var href = decodeURIComponent(req.query.id);
  //("treeNode for " + href);

  if (href === '#') {
    getHubs(tokenSession, res);
  } else {
    var params = href.split('/');
    var resourceName = params[params.length - 2];
    var resourceId = params[params.length - 1];
    switch (resourceName) {
      case 'hubs':
        getProjects(resourceId, tokenSession, res);
        break;
      case 'projects':
        // for a project, first we need the top/root folder
        var hubId = params[params.length - 3];
        getFolders(hubId, resourceId, tokenSession, res)
        break;
      case 'folders':
        var projectId = params[params.length - 3];
        getFolderContents(projectId, resourceId/*folder_id*/, tokenSession, res);
        break;
      case 'items':
        var projectId = params[params.length - 3];
        getVersions(projectId, resourceId/*item_id*/, tokenSession, res);
        break;
    }
  }
});

function getFolders(hubId, projectId, tokenSession, res) {
  // if the caller is a project, then show folders

  var projects = new forgeSDK.ProjectsApi();
  projects.getProjectTopFolders(hubId, projectId, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
    .then(function (topFolders) {
      var folderItemsForTree = [];
      topFolders.body.data.forEach(function (item) {
        folderItemsForTree.push(prepareItemForTree(
          item.links.self.href,
          item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName,
          item.type,
          true
        ))
      });
      res.json(folderItemsForTree);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).end();
    });
}


function getProjects(hubId, tokenSession, res) {
  // if the caller is a hub, then show projects
  var projects = new forgeSDK.ProjectsApi();

  //console.log(tokenSession.getInternalOAuth());
  //console.log(tokenSession.getInternalCredentials());

  projects.getHubProjects(hubId, {},
    tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
    .then(function (projects) {
      var projectsForTree = [];
      projects.body.data.forEach(function (project) {
        var projectType = 'projects';
        switch (project.attributes.extension.type) {
          case 'projects:autodesk.core:Project':
            projectType = 'a360projects';
            break;
          case 'projects:autodesk.bim360:Project':
            if (project.attributes.extension.data.projectType == 'ACC') {
              projectType = 'accprojects';
            } else {
              projectType = 'bim360projects';
            }
            break;
        }

        projectsForTree.push(prepareItemForTree(
          project.links.self.href,
          project.attributes.name,
          projectType,
          true
        ));
      });
      res.json(projectsForTree);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).end();
    });
}



function getHubs(tokenSession, res) {
  // # stands for ROOT
  var hubs = new forgeSDK.HubsApi();

  hubs.getHubs({}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
    .then(function (data) {
      var hubsForTree = [];
      data.body.data.forEach(function (hub) {
        var hubType;

        switch (hub.attributes.extension.type) {
          case "hubs:autodesk.core:Hub":
            hubType = "hubs";
            break;
          case "hubs:autodesk.a360:PersonalHub":
            hubType = "personalHub";
            break;
          case "hubs:autodesk.bim360:Account":
            hubType = "bim360hubs";
            break;
        }

        hubsForTree.push(prepareItemForTree(
          hub.links.self.href,
          hub.attributes.name,
          hubType,
          true
        ));
      });
      res.json(hubsForTree);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).end();
    });
}



function getFolderContents(projectId, folderId, tokenSession, res) {
  var folders = new forgeSDK.FoldersApi();
  folders.getFolderContents(projectId, folderId, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
    .then(function (folderContents) {
      var folderItemsForTree = [];
      folderContents.body.data.forEach(function (item) {

        var displayName = item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName;
        if (displayName !== '') { // BIM 360 Items with no displayName also don't have storage, so not file to transfer
          folderItemsForTree.push(prepareItemForTree(
            item.links.self.href,
            displayName,
            item.type,
            true
          ));
        }
      });
      res.json(folderItemsForTree);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).end();
    });
}

var moment = require('moment');

function getVersions(projectId, itemId, tokenSession, res) {
  var items = new forgeSDK.ItemsApi();
  items.getItemVersions(projectId, itemId, {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
    .then(function (versions) {
      var versionsForTree = [];
      versions.body.data.forEach(function (version) {
        var lastModifiedTime = moment(version.attributes.lastModifiedTime);
        var days = moment().diff(lastModifiedTime, 'days');
        var fileType = version.attributes.fileType;
        var dateFormated = (versions.body.data.length > 1 || days > 7 ? lastModifiedTime.format('MMM D, YYYY, h:mm a') : lastModifiedTime.fromNow());
        var designId = (version.relationships != null && version.relationships.derivatives != null ? version.relationships.derivatives.data.id : null);
        var fileName = version.attributes.fileName;
        versionsForTree.push(prepareItemForTree(
          designId,
          dateFormated + ' by ' + version.attributes.lastModifiedUserName,
          'versions',
          false,
          fileType,
          fileName
        ));
      });
      res.json(versionsForTree);
    })
    .catch(function (error) {
      console.log(error);
      res.status(500).end();
    })
}



function prepareItemForTree(_id, _text, _type, _children, _fileType, _fileName) {
  return { id: _id, text: _text, type: _type, children: _children, fileType: _fileType, fileName: _fileName };
}

/*
    switch (resourceName) {
      case 'hubs':
        // if the caller is a hub, then show projects
        var projects = new forgeSDK.ProjectsApi();
        projects.getHubProjects(resourceId, {},
          tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
          .then(function (projects) {
            res.json(prepareArrayForJSTree(projects.body.data, true));
          })
          .catch(function (error) {
            console.log(error);
            respondWithError(res, error);
          });
        break;
      case 'projects':
        // if the caller is a project, then show folders
        var hubId = params[params.length - 3];
        var projects = new forgeSDK.ProjectsApi();
        projects.getProject(hubId, resourceId,
          tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
          .then(function (project) {
            var rootFolderId = project.body.data.relationships.rootFolder.data.id;
            var folders = new forgeSDK.FoldersApi();
            folders.getFolderContents(resourceId, rootFolderId, {},
              tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
              .then(function (folderContents) {
                res.json(prepareArrayForJSTree(folderContents.body.data, true));
              })
              .catch(function (error) {
                console.log(error);
                respondWithError(res, error);
              });
          })
          .catch(function (error) {
            console.log(error);
            respondWithError(res, error);
          });
        break;
      case 'folders':
        // if the caller is a folder, then show contents
        var projectId = params[params.length - 3];
        var folders = new forgeSDK.FoldersApi();
        folders.getFolderContents(projectId, resourceId,
          {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
          .then(function (folderContents) {
            res.json(prepareArrayForJSTree(folderContents.body.data, true));
          })
          .catch(function (error) {
            console.log(error);
            respondWithError(res, error);
          });
        break;
      case 'items':
        // if the caller is an item, then show versions
        var projectId = params[params.length - 3];
        var items = new forgeSDK.ItemsApi();
        items.getItemVersions(projectId, resourceId,
          {}, tokenSession.getInternalOAuth(), tokenSession.getInternalCredentials())
          .then(function (versions) {
            res.json(prepareArrayForJSTree(versions.body.data, false));
          })
          .catch(function (error) {
            console.log(error);
            respondWithError(res, error);
          });
    }
*/




var moment = require('moment');

// Formats a list to JSTree structure
function prepareArrayForJSTree(listOf, canHaveChildren, data) {
  if (listOf == null) return '';
  var treeList = [];
  listOf.forEach(function (item, index) {

    var szDate = item.attributes.lastModifiedTime;
    if (!canHaveChildren) {
      var lastModifiedTime = moment(item.attributes.lastModifiedTime);
      var days = moment().diff(lastModifiedTime, 'days')
      szDate = (listOf.length > 1 || days > 7 ? lastModifiedTime.format('MMM D, YYYY, h:mm a') : lastModifiedTime.fromNow());
    }

    var treeItem = {
      id: item.links.self.href,
      data: (item.relationships != null && item.relationships.derivatives != null ?
        item.relationships.derivatives.data.id : null),
      text: (item.type === 'versions' ? szDate : item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName),
      type: item.type,
      children: canHaveChildren
    };
    treeList.push(treeItem);
  });
  return treeList;
}


module.exports = router;