/*
 * Copyright (c) 2020 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0
 */
define(["../init/appController"], function (repositoryControllers) {

  repositoryControllers.controller('DetailsController',
      ['$q', '$rootScope', '$scope', '$http', '$routeParams', '$location',
        '$route',
        '$uibModal', '$window', '$timeout', 'openCreateModelDialog',
        'confirmPublish', 'SessionTimeoutService',
        function ($q, $rootScope, $scope, $http, $routeParams, $location,
            $route,
            $uibModal,
            $window, $timeout, openCreateModelDialog,
            confirmPublish, sessionTimeoutService) {

          $scope.model = [];
          $scope.aclEntries = [];
          $scope.platformGeneratorMatrix = null;
          $scope.platformDemoGeneratorMatrix = null;
          $scope.workflowActions = [];
          $scope.chosenFile = false;
          $scope.editMode = false;
          /*
          The two properties below (isLoading and modelIsLoading) are now
          referenced by the upper-bar buttons, which will be displayed only if
          those flags are set to false.
          This is to avoid having buttons available while the model is not yet
          fully loaded, which can bear unexpected consequences.
          As a result, every function that sets either of the flags to true
          *must* set them to false both on successful or error conditions, once
          terminated, lest the buttons do not appear as expected.
           */
          $scope.modelIsLoading = false;
          $scope.isLoading = false;
          $scope.isLoadingGenerators = false;
          $scope.showReferences = false;
          $scope.showUsages = false;
          $scope.showMappings = true;
          $scope.modelFileNames = [];
          $scope.modelEditor = null;
          $scope.attachments = [];
          $scope.permission = "READ";
          $scope.encodeURIComponent = encodeURIComponent;
          $scope.newComment = {value: ""};
          $scope.canGenerate = true;
          $scope.canPublishModel = false;
          $scope.error = false;

          $scope.editorConfig = {
            infomodel: {
              syntaxDefinition: "webjars/repository-web/dist/js/ace-modes/mode-infomodel",
              serviceUrl: "infomodel/xtext-service"
            },
            fbmodel: {
              syntaxDefinition: "webjars/repository-web/dist/js/ace-modes/mode-fbmodel",
              serviceUrl: "functionblock/xtext-service"
            },
            type: {
              syntaxDefinition: "webjars/repository-web/dist/js/ace-modes/mode-type",
              serviceUrl: "datatype/xtext-service"
            },
            mapping: {
              syntaxDefinition: "webjars/repository-web/dist/js/ace-modes/mode-mapping",
              serviceUrl: "mapping/xtext-service"
            }
          };

          sessionTimeoutService.initSessionTimeoutWarning($scope);

          $scope.createEditor = function (model) {
            var language = "";
            if (model.type === 'Datatype') {
              language = "type";
            } else if (model.type === 'Functionblock') {
              language = "fbmodel";
            } else if (model.type === 'InformationModel') {
              language = "infomodel";
            } else {
              language = "mapping";
            }

            var defer = $q.defer();
            require(["webjars/ace/src/ace"], function () {
              require(["xtext/xtext-ace"], function (xtext) {
                var editor = xtext.createEditor({
                  enableFormattingAction: true,
                  enableSaveAction: false,
                  resourceId: model.id.prettyFormat,
                  loadFromServer: false,
                  showErrorDialogs: false,
                  enableValidationService: false,
                  enableOccurrencesService: true,
                  enableHighlightingService: true,
                  xtextLang: language,
                  syntaxDefinition: $scope.editorConfig[language].syntaxDefinition,
                  serviceUrl: $scope.editorConfig[language].serviceUrl
                });
                $scope.modelEditor = editor;
                if (model.released) {
                  editor.setReadOnly(true);
                }
                defer.resolve(editor);
              });
            });
            return defer.promise;
          };

          $scope.saveModel = function () {
            $scope.isLoading = true;
            $scope.error = false;
            var newContent = {
              contentDsl: $scope.modelEditor.getSession().getDocument().getValue(),
              type: $scope.model.type

            };

            $http.put('./rest/models/' + $scope.model.id.prettyFormat,
                newContent)
            .then(
                function (result) {
                  $scope.isLoading = false;
                  $scope.message = result.data.message;
                  if (result.data.valid) {
                    $scope.loadDetails();
                  } else {
                    $scope.validationIssues = result.data.validationIssues;
                  }
                },
                function (error) {
                  $scope.isLoading = false;
                  if (error.status === 400) {
                    $scope.message = error.data.message;
                    $scope.validationIssues = error.data.validationIssues;
                  } else {
                    $scope.error = error.data;
                  }
                }
            );
          };

          $scope.uploadImage = function () {
            var fd = new FormData();
            fd.append('file', document.getElementById('imageFile').files[0]);
            $http.post(
                './rest/models/' + $scope.model.id.prettyFormat + '/images/',
                fd,
                {
                  transformRequest: angular.identity,
                  headers: {
                    'Content-Type': undefined
                  }
                }
            )
            .then(
                function (result) {
                  $timeout(
                      function () {
                        $window.location.reload();
                      },
                      500
                  );
                },
                function (error) {
                  if (error.data && error.data.errorMessage) {
                    $rootScope.error = {
                      "message": error.data.errorMessage
                    };
                  } else {
                    $rootScope.error = {
                      "message": "Could not upload the image at this time. "
                    };
                  }
                }
            );
          };

          $scope.hasImage = function () {
            if (model.hasImage) {
              return "image"
            } else {
              return "placeHolder"
            }
          };

          $scope.chooseImageFile = function () {
            document.getElementById("imageFile").click();
          };

          $scope.getAttachments = function (model) {
            if ($rootScope.hasAuthority("sysadmin")) {
              $http.get("./api/v1/attachments/" + model.id.prettyFormat)
              .then(
                  function (result) {
                    $scope.attachments = result.data;
                  },
                  function (error) {
                  }
              );
            } else {
              $http.get("./api/v1/attachments/static/" + model.id.prettyFormat)
              .then(
                  function (result) {
                    $scope.attachments = result.data.attachments;
                  },
                  function (error) {
                  }
              );
            }

          };

          $scope.getMappings = function () {
            $scope.modelMappings = [];
            for (var i = 0;
                i < Object.keys($scope.model.platformMappings).length;
                i++) {

              var id = Object.keys($scope.model.platformMappings)[i];
              var key = $scope.model.platformMappings[id];
              $http.get("./api/v1/models/" + id + "?key=key")
              .then(
                  (function (key) {
                    return function (result) {
                      var mapping = {
                        "id": result.data.id,
                        "state": result.data.state,
                        "targetPlatform": key
                      };
                      $scope.modelMappings.push(mapping);
                    }
                  })(key),
                  function (data) {
                    //
                  });
            }
          };

          $scope.getReferences = function () {
            references = $scope.model.references;
            $scope.modelReferences = [];
            $scope.modelReferences.show = false;
            var tmpIdx = 0;
            for (var index in references) {
              $http.get("./api/v1/models/" + references[index].prettyFormat)
              .then(
                  function (result) {
                    $scope.modelReferences[tmpIdx] = {
                      "modelId": result.data.id.prettyFormat,
                      "state": result.data.state,
                      "type": result.data.type,
                      "hasAccess": true
                    };
                    $scope.modelReferences.show = true;
                    tmpIdx++;
                  },
                  function (error) {
                    $scope.modelReferences[tmpIdx] = {
                      "modelId": references[tmpIdx].prettyFormat,
                      "state": null,
                      "hasAccess": false
                    };
                    $scope.canGenerate = false;
                    $scope.modelReferences.show = true;
                    tmpIdx++;
                  }
              );
            }
          };

          $scope.getReferencedBy = function () {
            referencedBy = $scope.model.referencedBy;
            $scope.modelReferencedBy = [];
            $scope.modelReferencedBy.show = false;
            var tmpIdx = 0;
            for (var index in referencedBy) {
              $http.get("./api/v1/models/" + referencedBy[index].prettyFormat)
              .then(
                  function (result) {
                    $scope.modelReferencedBy[tmpIdx] = {
                      "modelId": result.data.id.prettyFormat,
                      "type": result.data.type,
                      "state": result.data.state,
                      "hasAccess": true
                    };
                    $scope.modelReferencedBy.show = true;
                    tmpIdx++;
                  },
                  function (error) {
                    $scope.modelReferencedBy[tmpIdx] = {
                      "modelId": referencedBy[tmpIdx].prettyFormat,
                      "state": null,
                      "hasAccess": false
                    };
                    $scope.modelReferencedBy.show = true;
                    tmpIdx++;
                  }
              );
            }
          };

          $scope.getDetails = function (modelId) {
            var defer = $q.defer();
            $scope.modelIsLoading = true;
            $http.get("./api/v1/models/" + modelId)
            .then(
                function (result) {
                  $scope.model = result.data;
                  if ($scope.model.author.length === 64) {
                    $scope.model.author = 'other user';
                  }
                  $scope.getMappings();
                  $scope.getReferences();
                  $scope.getReferencedBy();
                  $scope.getAttachments(result.data);

                  $scope.canCreateModels = false;



                  if ($rootScope.authenticated && $rootScope.authority && $rootScope.authority.includes("model_creator")) {
                      $scope.canCreateModels = result.data;

                    $scope.getUserPolicy();
                    $scope.getAllUserPolicies();
                  }

                  $scope.showReferences = false;
                  $scope.showUsages = false;

                  $scope.modelIsLoading = false;

                  defer.resolve(result.data);

                },
                function (error) {
                  if (error.status == 401) {
                    $location.path('/login');
                  } else if (error.status == 403) {
                    $scope.errorLoading = 'No permission to access model';
                  } else {
                    $scope.errorLoading = error.data.message;
                  }
                  defer.reject(error.data.message);
                  $scope.modelIsLoading = false;
                }
            );

            return defer.promise;
          };

          $scope.getContent = function (modelId) {
            $scope.loadingModel = true;
            $http.get("./api/v1/models/" + modelId + "/file")
            .then(
                function (result) {
                  $scope.modelEditor.getSession().getDocument().setValue(
                      result.data);
                  $scope.loadingModel = false;
                },
                function (error) {
                  $scope.error = error.data.message;
                }
            );
          };

          $scope.getPlatformGenerators = function () {
            $scope.isLoadingGenerators = true;
            $http.get('./api/v1/generators')
            .then(
                function (result) {
                  $scope.isLoadingGenerators = false;
                  var productionGenerators = $scope.filterByTag(result.data,
                      "production");
                  var demoGenerators = $scope.filterByTag(result.data, "demo");
                  $scope.platformGeneratorMatrix = $scope.listToMatrix(
                      productionGenerators, 2);
                  $scope.platformDemoGeneratorMatrix = $scope.listToMatrix(
                      demoGenerators, 2);
                },
                function (error) {
                }
            );
          };

          $scope.filterByTag = function (result, tag) {
            var filteredList = [];
            result.forEach(function (e) {
              if (e.tags.includes(tag)) {
                filteredList.push(e);
              }
            });
            return filteredList;
          };

          $scope.isFilled = function (rating, value) {
            if (rating === value) {
              return "filled"
            }
          };

          $scope.listToMatrix = function (list, n) {
            var grid = [],
                x = list.length,
                col, row = -1;
            for (var i = 0; i < x; i++) {
              col = i % n;
              if (col === 0) {
                grid[++row] = [];
              }
              grid[row][col] = list[i];
            }
            return grid;
          };

          $scope.modelId = $routeParams.modelId;

          /*
           * Start - Handling Comments
           */
          $scope.comments = [];
          $authority = $rootScope.authority;

          $scope.getCommentsForModelId = function (modelId) {

            $http.get('./rest/comments/' + modelId)
            .then(
                function (result) {
                  $scope.comments = result.data;
                  $scope.comments.reverse();
                },
                function (error) {

                  if (error.status == 403) {
                    $rootScope.error = "Operation is Forbidden";
                  } else if (error.status == 401) {
                    $rootScope.error = "Unauthorized Operation";
                  } else if (error.status == 400) {
                    $rootScope.error = "Could not be removed because it references other models "
                        + JSON.stringify(data);
                  } else if (error.status == 500) {
                    $rootScope.error = "Internal Server Error";
                  } else {
                    $rootScope.error = "Failed Request with response status "
                        + error.status;
                  }
                }
            );
          };

          $scope.createComment = function () {

            $scope.date = new Date();

            var comment = {
              "modelId": $scope.modelId,
              "author": $scope.user,
              "date": $scope.date,
              "content": $scope.newComment.value
            };

            $http.post('./rest/comments', comment)
            .then(
                function (result) {
                  $scope.getCommentsForModelId($scope.modelId);
                },
                function (error) {
                  if (error.status == 403) {
                    $rootScope.error = "Operation is Forbidden";
                  } else if (error.status == 401) {
                    $rootScope.error = "Unauthorized Operation";
                  } else if (error.status == 400) {
                    $rootScope.error = "Could not be removed because it references other models "
                        + JSON.stringify(error.data);
                  } else if (error.status == 500) {
                    $rootScope.error = "Internal Server Error";
                  } else {
                    $rootScope.error = "Failed Request with response status "
                        + error.status;
                  }
                }
            );

            $scope.newComment.value = "";
          };

          /*
           * Stop - Handling Comments
           */
          $scope.openGeneratorConfig = function (generator) {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: "GeneratorConfigController",
              templateUrl: "webjars/repository-web/dist/partials/generator-config-template.html",
              size: "lg",
              resolve: {
                generator: function () {
                  return generator;
                },
                model: function () {
                  return $scope.model;
                }
              }
            });
          };

          /*
           * Start - Workflow
           */
          $scope.getWorkflowActions = function () {
            $http.get('./rest/workflows/' + $scope.modelId + '/actions')
            .then(
                function (result) {
                  $scope.workflowActions = result.data;
                },
                function (error) {
                }
            );
          };

          $scope.openWorkflowActionDialog = function (action) {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: function ($scope, model) {
                $scope.action = action;
                $scope.actionModel = null;
                $scope.model = model;
                $scope.errorMessage = "";
                $scope.hasError = false;

                $scope.takeWorkflowAction = function () {
                  $http.put('./rest/workflows/' + $scope.model.id.prettyFormat
                      + '/actions/' + $scope.action)
                  .then(
                      function (result) {
                        if (result.data.hasErrors) {
                          $scope.hasErrors = true;
                          $scope.errorMessage = result.data.errorMessage;
                        } else {
                          modalInstance.close();
                        }
                      },
                      function (error) {
                        console.log(
                            JSON.stringify(error.data) + ":" + JSON.stringify(
                            error.status) + ":"
                            + JSON.stringify(error.data.headers));
                      }
                  );
                };

                $scope.getModel = function () {
                  $http.get('./rest/workflows/' + $scope.model.id.prettyFormat)
                  .then(
                      function (result) {
                        for (var i = 0; i < result.data.actions.length; i++) {
                          if (result.data.actions[i].name === $scope.action) {
                            $scope.actionModel = result.data.actions[i];
                            return;
                          }
                        }
                      },
                      function (error) {
                      }
                  );
                };

                $scope.getModel();

                $scope.cancel = function () {
                  modalInstance.dismiss();
                };
              },
              templateUrl: "workflowActionDialog.html",
              size: "lg",
              resolve: {
                action: function () {
                  return action;
                },
                model: function () {
                  return $scope.model;
                }
              }
            });

            modalInstance.result.then(
                function () {
                  $scope.loadDetails();
                }
            );
          };
          /*
           * Start - Handle Modal
           */
          $scope.openDeleteDialog = function (model) {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: function ($scope, model) {
                $scope.model = model;

                $scope.delete = function () {
                  $http.delete('./rest/models/' + model.id.prettyFormat)
                  .then(
                      function (result) {
                        modalInstance.close();
                      },
                      function (error) {
                      }
                  );
                };

                $scope.cancel = function () {
                  modalInstance.dismiss();
                };
              },
              templateUrl: "deleteActionDialog.html",
              size: "lg",
              resolve: {
                model: function () {
                  return $scope.model;
                }
              }
            });

            modalInstance.result.then(
                function () {
                  $location.path('/');
                });
          };

          $scope.openCreateModelDialog = openCreateModelDialog($scope);

          $scope.openCreateModelVersionDialog = function (action) {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: function ($scope, model) {
                $scope.errorMessage = null;
                $scope.model = model;
                $scope.modelVersion = "";

                $scope.createVersion = function () {
                  $scope.isLoading = true;
                  $http.post("./rest/models/" + $scope.model.id.prettyFormat
                      + "/versions/" + $scope.modelVersion, null)
                  .then(
                      function (result) {
                        $scope.isLoading = false;
                        modalInstance.close(result.data);
                      },
                      function (error) {
                        $scope.isLoading = false;
                        if (error.status === 409) {
                          $scope.errorMessage = "Model with this name and namespace already exists.";
                        } else {
                          $scope.errorMessage = error.data.message;
                        }
                      }
                  );
                };

                $scope.cancel = function () {
                  modalInstance.dismiss();
                };
              },
              templateUrl: "webjars/repository-web/dist/partials/createversion-template.html",
              size: "lg",
              resolve: {
                model: function () {
                  return $scope.model;
                }
              }
            });

            modalInstance.result.then(
                function (model) {
                  $location.path("/details/" + model.id.prettyFormat);
                });
          };

          $scope.openRefactoringDialog = function () {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: function ($scope, model) {
                $scope.errorMessage = null;
                $scope.model = model;
                $scope.newNamespaceSuffix = "";
                $scope.newName = $scope.model.id.name;

                $scope.rename = function () {
                  $scope.isLoading = true;
                  $scope.newNamespace = $scope.defaultNamespace;
                  if ($scope.newNamespaceSuffix !== "") {
                    $scope.newNamespace += "." + $scope.newNamespaceSuffix;
                  }
                  $http.put(
                      "./rest/models/refactorings/"
                      + $scope.model.id.prettyFormat
                      + "/" + $scope.newNamespace + ":" + $scope.newName + ":"
                      + $scope.model.id.version, null)
                  .then(
                      function (result) {
                        $scope.isLoading = false;
                        modalInstance.close(result.data);
                      },
                      function (error) {
                        $scope.isLoading = false;
                        if (error.status === 409) {
                          $scope.errorMessage = "Model with this name and namespace already exists.";
                        } else {
                          $scope.errorMessage = error.data.message;
                        }
                      }
                  );
                };

                $scope.getDefaultNamespace = function () {
                  $http.get("./rest/models/refactorings/"
                      + $scope.model.id.prettyFormat)
                  .then(
                      function (result) {
                        $scope.defaultNamespace = result.data.namespace;
                        if ($scope.model.id.namespace.length
                            > result.data.namespace.length) {
                          $scope.newNamespaceSuffix = $scope.model.id.namespace.substring(
                              result.data.namespace.length + 1);
                        }
                      },
                      function (error) {
                        $scope.isLoading = false;
                        if (error.status === 409) {
                          $scope.errorMessage = "Model with this name and namespace already exists.";
                        } else {
                          $scope.errorMessage = error.data.message;
                        }
                      }
                  );
                };

                $scope.getDefaultNamespace();

                $scope.cancel = function () {
                  modalInstance.dismiss();
                };
              },
              templateUrl: "refactoringDialog.html",
              size: "lg",
              resolve: {
                model: function () {
                  return $scope.model;
                }
              }
            });

            modalInstance.result.then(
                function (model) {
                  $location.path("/details/" + model.id.prettyFormat);
                });
          };

          $scope.openSearchDialog = function () {
            var modalInstance = $uibModal.open({
              animation: true,
              controller: function ($scope, model) {
                $scope.currentModel = model;
                $scope.isLoading = false;
                $scope.searchResult = [];
                $scope.searchModelType = 'all';
                $scope.searchFilter = "";

                $scope.searchReferences = function () {
                  $scope.isLoading = true;
                  var filter = null;
                  if ($scope.searchModelType === 'all') {
                    filter = $scope.searchFilter;
                  } else {
                    filter = $scope.searchFilter + " " + $scope.searchModelType;
                  }
                  $http.get('./api/v1/search/models?expression=' + filter)
                  .then(
                      function (result) {
                        $scope.searchResult = result.data;
                        $scope.isLoading = false;
                      },
                      function (error) {
                        $scope.searchResult = [];
                        $scope.isLoading = false;
                      }
                  );
                };

                $scope.copyToClipboard = function (modelId) {
                  var $temp_input = $("<input>");
                  $("body").append($temp_input);
                  $temp_input.val(
                      "using " + modelId.namespace + "." + modelId.name + ";"
                      + modelId.version).select();
                  document.execCommand("copy");
                  $temp_input.remove();
                  modalInstance.dismiss();
                };

                $scope.searchReferences();

                $scope.cancel = function () {
                  modalInstance.dismiss();
                };

                $scope.displayedSearchResult = [].concat($scope.searchResult);
                $scope.itemsByPage = 6;

              },
              templateUrl: "searchDialog.html",
              size: "lg",
              resolve: {
                model: function () {
                  return $scope.model;
                }
              }
            });

          };

          /*Model Attachments upload & download*/
          $scope.openUploadAttachmentDialog = function (modelId) {
            var updateAttachments = $scope.getAttachments;
            var model = $scope.model;
            var uploadDialog = $uibModal.open({
              animation: true,
              templateUrl: "uploadAttachment.html",
              size: "lg",
              controller: function ($scope) {
                $scope.successfullyUploaded = false;
                $scope.failedToUpload = false;
                $scope.isUploading = false
                $scope.modelId = modelId;
                $scope.fileSizeValid = true;
                $scope.fileNameValid = true;
                $scope.selectedFile = null;
                $scope.errorMessage = "";
                $scope.attachmentValid = true;
                $scope.attachmentNote = "Max file size "
                    + $rootScope.context.attachmentAllowedSize + " MB."

                $scope.cancel = function () {
                  $scope.successfullyUploaded = false;
                  $scope.failedToUpload = false;
                  $scope.errorMessage = "";
                  uploadDialog.dismiss();
                };

                //validate if file size should be smaller than 64 kBytes
                $scope.isFileSizeValid = function () {
                  var input = document.getElementById("file-upload");

                  if (input.files[0]) {
                    $scope.selectedFile = input.files[0];
                    $scope.$apply(function () {
                      $scope.fileSizeValid = true;
                      $scope.fileNameValid = true;
                    });
                  }
                };

                $scope.fileNameChanged = function (element) {
                  $scope.$apply(function ($scope) {
                    $scope.browsedFile = element.files[0].name;
                  });
                  $scope.fileAdded = true;
                  $scope.$digest();
                };

                $scope.uploadAttachment = function () {
                  $scope.isUploading = true;
                  $scope.attachmentValid = true;
                  var payload = new FormData();
                  payload.append('file', $scope.selectedFile,
                      encodeURIComponent($scope.selectedFile.name));

                  const attachment_url = './api/v1/attachments/'
                      + $scope.modelId;
                  $scope.attachmentNote = "Uploading..."
                  $http.put(attachment_url, payload, {
                    transformRequest: angular.identity,
                    headers: {
                      'Content-Type': undefined
                    }
                  })
                  .then(
                      function (result) {
                        updateAttachments(model);
                        $scope.isUploading = false;
                        if (result.data.success) {
                          $scope.successfullyUploaded = true;
                          $timeout($scope.cancel, 2000);
                        } else {
                          $scope.successfullyUploaded = false;
                          $scope.attachmentValid = false;
                          $scope.failedToUpload = false;
                          $scope.errorMessage = result.data.errorMessage;
                        }
                      },
                      function (error) {
                        $scope.successfullyUploaded = false;
                        $scope.attachmentValid = false;
                        $scope.failedToUpload = false;
                        $scope.isUploading = false;
                        $scope.errorMessage = "File size exceeded. Allowed max size: "
                            + $rootScope.context.attachmentAllowedSize + " MB";
                      }
                  );

                };
              }
            });
          };

          $scope.openDeleteAttachmentDialog = function (modelId, fileToDelete) {
            var updateAttachments = $scope.getAttachments;
            var model = $scope.model;
            var dialog = $uibModal.open({
              animation: true,
              templateUrl: "dipAttachment.html",
              size: "lg",
              controller: function ($scope) {
                $scope.modelId = modelId;
                $scope.fileToDelete = fileToDelete;
                $scope.isDeleting = false;
                $scope.successfullyDeleted = false;
                $scope.failedToDelete = false;

                $scope.cancel = function () {
                  $scope.failedToDelete = false;
                  dialog.dismiss();
                };

                $scope.deleteAttachment = function () {
                  $scope.isDeleting = true;
                  const attachment_url = './api/v1/attachments/'
                      + $scope.modelId
                      + '/files/' + encodeURIComponent($scope.fileToDelete);

                  $http.delete(attachment_url, {
                    transformRequest: angular.identity,
                    headers: {
                      'Content-Type': undefined
                    }
                  })
                  .then(
                      function (result) {
                        $scope.isDeleting = false;
                        $scope.successfullyDeleted = true;
                        updateAttachments(model);
                        $timeout($scope.cancel, 1000);
                      },
                      function (error) {
                        $scope.isDeleting = false;
                        $scope.successfullyDeleted = false;
                        $scope.failedToDelete = true;
                      }
                  );
                };
              },
              templateUrl: "deleteAttachmentDialog.html",
              size: "lg"
            });
          };

          $scope.getUserPolicy = function () {
            $http.get('./rest/models/' + $scope.modelId + '/policy')
            .then(
                function (result) {
                  $scope.permission = result.data.permission;
                  if ($scope.model.state === 'InReview' || $scope.model.released
                      === true || $rootScope.authenticated === false
                      || $scope.permission === "READ") {
                  }
                },
                function (error) {
                  $scope.permission = "READ";
                  if (($scope.model.state === 'InReview'
                      || $scope.model.released
                      === true || $rootScope.authenticated === false
                      || $scope.permission === "READ")
                      && !$rootScope.hasAuthority(
                          "sysadmin")) {
                  }
                }
            );
          };

          $scope.getAllUserPolicies = function () {
            $http.get('./rest/models/' + $scope.modelId + '/policies')
            .then(
                function (result) {
                  $scope.canPublishModel = result.data.some(
                      function (e, i, a) {
                        return e.principalId && e.principalId
                            == "model_publisher";
                      }
                  );
                },
                function (error) {
                  $scope.permission = "READ";
                  $scope.canPublishModel = false;
                }
            );
          };

          $scope.isEditingVisible = function (model) {
            return $scope.permission !== 'READ' && !model.released;
          };

          $scope.hasOfficialPrefix = function (model) {
            return !model.id.namespace.startsWith(
                $rootScope.privateNamespacePrefix);
          };

          $scope.makePublic = function (model) {
            var dialog = confirmPublish($scope);

            dialog.setConfirmCallback(function () {
              $http.post(
                  './rest/models/' + model.id.prettyFormat + '/makePublic')
              .then(
                  function (result) {
                    $scope.loadDetails();
                  },
                  function (error) {
                    // TODO : Show error on window
                    console.log(JSON.stringify(error));
                  }
              );
            });

            dialog.run();
          };

          $scope.loadDetails = function () {
            $scope.getDetails($scope.modelId).then(function (model) {
              var editor = $scope.modelEditor;
              if (editor == null) {
                $scope.createEditor(model).then(function (editor) {
                  $scope.getContent($scope.modelId, editor);
                });
              } else {
                $scope.getContent($scope.modelId, editor);
              }
              $scope.getWorkflowActions();
            });
            $scope.getPlatformGenerators();
          };

          $scope.loadDetails();
        }
      ]);

});
