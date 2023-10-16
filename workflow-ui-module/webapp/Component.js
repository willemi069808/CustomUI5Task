sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "workflowuimodule/model/models",
  ],
  function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend(
      "workflowuimodule.Component",
      {
        metadata: {
          manifest: "json",
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function () {
          // call the base component's init function
          UIComponent.prototype.init.apply(this, arguments);

          // enable routing
          this.getRouter().initialize();

          // set the device model
          this.setModel(models.createDeviceModel(), "device");

          // const t = {
          //   "SAP__Origin": "NA",
          //   "InstanceID": "70f30c3a-6bf5-11ee-beb8-eeee0a94a675",
          //   "TaskDefinitionID": "form_approvalForm_5@eu10.spa-app-dev-team-dsq6emq0.customui5task.approvePDF",
          //   "TaskDefinitionName": "Approval Form",
          //   "TaskTitle": "Document Approval",
          //   "Priority": "MEDIUM",
          //   "PriorityText": "Medium",
          //   "Status": "READY",
          //   "StatusText": "Ready",
          //   "CreatedOn": "2023-10-16T07:27:20.093Z",
          //   "CreatedBy": "willem.pardaens@sap.com",
          //   "CreatedByName": "willem.pardaens@sap.com",
          //   "SubstitutedUserName": null,
          //   "CompletionDeadLine": null,
          //   "PriorityNumber": 5,
          //   "ConfidenceLevel": null
          // }
          // const c = {
          //   "BusinessReason": "reason",
          //   "CMISFolder": "spa-res:cmis:folderid:JxRj1KWVaLcD8A54pYXcoJaI8YXNINRf9vZbOrrFPFs",
          //   "CMISFiles": [
          //     {
          //       "Name": "My file",
          //       "Path": "/ApprovalCustomUI5.workflowuimodule-0.2.0/spa_dms/root?objectId=5GuzLBXnTHxCbAWG0UekV7RvJGb4VaoE4mZHk1vXtK4"
          //     },
          //     {
          //       "Name": "My file 2",
          //       "Path": "/ApprovalCustomUI5.workflowuimodule-0.2.0/spa_dms/root?objectId=5GuzLBXnTHxCbAWG0UekV7RvJGb4VaoE4mZHk1vXtK5"
          //     }
          //   ]
          // }
          // this.setModel(new sap.ui.model.json.JSONModel(t), "task");
          // this.setModel(new sap.ui.model.json.JSONModel(c), "context");

          this.setTaskModels();
          this.expandCMISFolderToFiles();

          this.getInboxAPI().addAction(
            {
              action: "APPROVE",
              label: "Approve",
              type: "accept", // (Optional property) Define for positive appearance
            },
            function () {
              this.completeTask(true);
            },
            this
          );

          this.getInboxAPI().addAction(
            {
              action: "REJECT",
              label: "Reject",
              type: "reject", // (Optional property) Define for negative appearance
            },
            function () {
              this.completeTask(false);
            },
            this
          );
        },

        setTaskModels: function () {
          // set the task model
          var startupParameters = this.getComponentData().startupParameters;
          this.setModel(startupParameters.taskModel, "task");

          // set the task context model
          var taskContextModel = new sap.ui.model.json.JSONModel(
            this._getTaskInstancesBaseURL() + "/context"
          );

          this.setModel(taskContextModel, "context");
        },

        _getTaskInstancesBaseURL: function () {
          return (
            this._getWorkflowRuntimeBaseURL() +
            "/task-instances/" +
            this.getTaskInstanceID()
          );
        },

        _getWorkflowRuntimeBaseURL: function () {
          var appId = this.getManifestEntry("/sap.app/id");
          var appPath = appId.replaceAll(".", "/");
          var appModulePath = jQuery.sap.getModulePath(appPath);

          return appModulePath + "/bpmworkflowruntime/v1";
        },

        getTaskInstanceID: function () {
          return this.getModel("task").getData().InstanceID;
        },

        getInboxAPI: function () {
          var startupParameters = this.getComponentData().startupParameters;
          return startupParameters.inboxAPI;
        },

        completeTask: function (approvalStatus) {
          this.getModel("context").setProperty("/approved", approvalStatus);
          this._patchTaskInstance(approvalStatus);
          this._refreshTaskList();
        },

        _patchTaskInstance: function (approvalStatus) {
          var data = {
            status: "COMPLETED",
            context: this.getModel("context").getData(),
            decision: approvalStatus ? "approve" : "reject"
          };

          jQuery.ajax({
            url: this._getTaskInstancesBaseURL(),
            method: "PATCH",
            contentType: "application/json",
            async: false,
            data: JSON.stringify(data),
            headers: {
              "X-CSRF-Token": this._fetchToken(),
            },
          });
        },

        _fetchToken: function () {
          var fetchedToken;

          jQuery.ajax({
            url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
            method: "GET",
            async: false,
            headers: {
              "X-CSRF-Token": "Fetch",
            },
            success(result, xhr, data) {
              fetchedToken = data.getResponseHeader("X-CSRF-Token");
            },
          });
          return fetchedToken;
        },

        _refreshTaskList: function () {
          this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
        },

        expandCMISFolderToFiles: async function () {
          this.getModel("context").dataLoaded().then(() => {
            const { CMISFolder } = this.getModel("context").getData();
            const { sApplicationPath } = this.getComponentData().startupParameters.oParameters;
            const folderID = CMISFolder?.match(/cmis\:folderid\:(.*)$/)[1];
            if (folderID) {
              const oFiles = new sap.ui.model.json.JSONModel(`/${sApplicationPath}/spa_dms/root?objectId=${folderID}`);
              oFiles.dataLoaded().then(() => {
                const aFiles = oFiles.getData()?.objects?.map(x => {
                  return {
                    Name: decodeURIComponent(x.object.properties['cmis:name'].value),
                    Path: `/${sApplicationPath}/spa_dms/root?objectId=${x.object.properties['cmis:objectId'].value}`
                  }
                }) || [];
                this.getModel("context").setProperty("/CMISFiles", aFiles)
              })
            }
          })
        }
      }
    );
  }
);
