sap.ui.define(
  [
    "sap/ui/core/mvc/Controller"
  ],
  function(BaseController) {
    "use strict";

    return BaseController.extend("workflowuimodule.controller.App", {
      onInit() {        
      },
      onSelectFile: function (e) {
        const item = this.getView().byId('listAttachments').getSelectedItem();
        if (item) {
          this.getView().byId('filePreview').setTitle(item.getLabel())
          this.getView().byId('filePreview').setSource(item.data().key);
        }
      },
      onUpdateFinished: function (e) {
        const len = this.getView().byId('listAttachments').getItems().length;
        this.getView().byId('AttachmentsHeader').setSubtitle(`${len} available`);
        if (len >= 1) {
          this.getView().byId('listAttachments').setSelectedItem(this.getView().byId('listAttachments').getItems()[0]);
          this.onSelectFile();
        }
      }
    });
  }
);
