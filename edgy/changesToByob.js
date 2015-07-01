(function() {
"use strict";

BlockExportDialogMorph.prototype.init = (function(oldInit) {
    return function(serializer, stage) {
        this.nodeAttributes = stage.nodeAttributes;
        this.edgeAttributes = stage.edgeAttributes;
        this.stage = stage;
        
        oldInit.call(this, serializer, stage.globalBlocks);
        
        this.fixLayout();
    }
}(BlockExportDialogMorph.prototype.init));

BlockExportDialogMorph.prototype.buildContents = (function(oldBuildContents) {
    return function() {
        oldBuildContents.call(this);
        
        var myself = this;
        var morph = new AlignmentMorph("column", 4);
        morph.alignment = "left";
        
        var oldFixLayout = morph.fixLayout;
        
        morph.fixLayout = function() {
            var checkBox1 = this.children[1];
            var checkBox2 = this.children[2];
            this.children[0].silentSetWidth(this.width());
            this.children[0].silentSetHeight(
                this.height() -
                (checkBox1 ? checkBox1.height() + 4 : 0) -
                (checkBox2 ? checkBox2.height() + 4 : 0)
            );
            this.children[0].drawNew();
            oldFixLayout.call(this);
        };
        
        morph.add(this.body);
        
        if (this.nodeAttributes && this.nodeAttributes.length > 0) {
            var nodeAttrCheckBox = new ToggleMorph(
                'checkbox',
                myself,
                function () {
                    myself.exportNodeAttrs = myself.exportNodeAttrs ? false : true;
                },
                'Export node attributes',
                function () {
                    return myself.exportNodeAttrs ? true : false;
                }
            );
            morph.add(nodeAttrCheckBox);
        }
        
        if (this.edgeAttributes && this.edgeAttributes.length > 0) {
            var edgeAttrCheckBox = new ToggleMorph(
                'checkbox',
                myself,
                function () {
                    myself.exportEdgeAttrs = myself.exportEdgeAttrs ? false : true;
                },
                'Export edge attributes',
                function () {
                    return myself.exportEdgeAttrs ? true : false;
                }
            );
            morph.add(edgeAttrCheckBox);
        }
        
        morph.fixLayout();
        
        this.body = null;
        this.addBody(morph);
        
        this.fixLayout();
    }
}(BlockExportDialogMorph.prototype.buildContents));

BlockExportDialogMorph.prototype.selectAll = function() {
    this.body.children[0].contents.children.forEach(function(checkBox) {
        if (!checkBox.state) {
            checkBox.trigger();
        }
    });
};

BlockExportDialogMorph.prototype.selectNone = function() {
    this.blocks = [];
    this.body.children[0].contents.children.forEach(function(checkBox) {
        checkBox.refresh();
    });
};

BlockExportDialogMorph.prototype.exportBlocks = function () {
    var myself = this;
    
    var exportBlocks = function() {
        var str = this.serializer.serialize(this.blocks);
        str += this.exportNodeAttrs ? '<nodeattrs>' + this.serializer.serialize(this.nodeAttributes) + '</nodeattrs>': '';
        str += this.exportEdgeAttrs ? '<edgeattrs>' + this.serializer.serialize(this.edgeAttributes) + '</edgeattrs>' : '';
        if (this.blocks.length > 0) {
            window.open(encodeURI('data:text/xml,<blocks app="'
                + this.serializer.app
                + '" version="'
                + this.serializer.version
                + '">'
                + str
                + '</blocks>'));
        } else {
            new DialogBoxMorph().inform(
                'Export blocks',
                'no blocks were selected',
                this.world()
            );
        }
    }.bind(this);
    
    // Compare the specs of two custom block definitions
    var compareSpec = function(d1, d2) {
        return d1.spec == d2.spec;
    };
    
    // Test if a particular block/morph contains/is a custom block
    var testBlock = function(element) {
        while (element) {
            if (element.children.some(testBlock))
                return true;
            
            if (element.definition instanceof CustomBlockDefinition) {
                // Check if we have elected to export this block
                var included = myself.blocks.some(
                    compareSpec.bind(null, element.definition)
                );
                if (!included)
                    return true;
            }
            
            // Also check the next block in a block sequence
            element = element.nextBlock ? element.nextBlock() : null;
        }
        return false;
    };
    
    // Check if any of the blocks exported have unmet dependencies
    var unmetDependencies = this.blocks.some(function(definition) {
        var element = definition.body ? definition.body.expression : null;
        return testBlock(element);
    });
    
    if (unmetDependencies)
        this.stage.parentThatIsA(IDE_Morph).confirm(
            "This export may lead to unmet custom block dependencies. Continue?",
            "Block export",
            exportBlocks
        );
    else
        exportBlocks();
    
};

}());