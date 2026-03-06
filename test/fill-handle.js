const { expect } = require('chai');

const jspreadsheet = require('../dist/index.js');

const createSheet = (worksheetOptions = {}) => {
    return jspreadsheet(root, {
        worksheets: [
            {
                minDimensions: [3, 5],
                data: [
                    ['seed', '', ''],
                    ['', '', ''],
                    ['', '', ''],
                    ['', '', ''],
                    ['', '', ''],
                ],
                ...worksheetOptions,
            },
        ],
    })[0];
};

const waitForWorksheetSetup = () => {
    return new Promise((resolve) => setTimeout(resolve, 0));
};

const dragFillHandleTo = (sheet, x, y) => {
    const corner = sheet.corner;
    const target = sheet.records[y][x].element;

    corner.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 1, which: 1 }));
    target.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, button: 1, which: 1 }));
};

const doubleClickFillHandle = (sheet) => {
    const corner = sheet.corner;

    corner.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
};

describe('Fill handle direction', () => {
    it('helpers resolve effective copy direction and fallback rules', () => {
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({})).to.eq('both');
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({ selectionCopyDirection: 'vertical' })).to.eq('vertical');
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({ selectionCopyDirection: 'horizontal' })).to.eq('horizontal');
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({ selectionCopyDirection: 'none' })).to.eq('none');
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({ selectionCopyDirection: 'diagonal' })).to.eq('both');
        expect(jspreadsheet.helpers.getEffectiveCopyDirection({ selectionCopy: false, selectionCopyDirection: 'vertical' })).to.eq('none');
    });

    it('updates drag preview for both, vertical, horizontal and none', async () => {
        const bothSheet = createSheet({ selectionCopyDirection: 'both' });
        await waitForWorksheetSetup();
        bothSheet.updateSelectionFromCoords(1, 0, 1, 0);
        dragFillHandleTo(bothSheet, 2, 3);
        expect(bothSheet.records[1][1].element.classList.contains('selection')).to.eq(true);
        expect(bothSheet.records[3][1].element.classList.contains('selection')).to.eq(true);
        expect(bothSheet.records[0][2].element.classList.contains('selection')).to.eq(false);

        const verticalSheet = createSheet({ selectionCopyDirection: 'vertical' });
        verticalSheet.updateSelectionFromCoords(1, 0, 1, 0);
        dragFillHandleTo(verticalSheet, 2, 2);
        expect(verticalSheet.records[1][1].element.classList.contains('selection')).to.eq(true);
        expect(verticalSheet.records[2][1].element.classList.contains('selection')).to.eq(true);
        expect(verticalSheet.records[0][2].element.classList.contains('selection')).to.eq(false);

        const horizontalSheet = createSheet({ selectionCopyDirection: 'horizontal' });
        horizontalSheet.updateSelectionFromCoords(1, 0, 1, 0);
        dragFillHandleTo(horizontalSheet, 2, 2);
        expect(horizontalSheet.records[0][2].element.classList.contains('selection')).to.eq(true);
        expect(horizontalSheet.records[0][1].element.classList.contains('selection')).to.eq(false);
        expect(horizontalSheet.records[1][1].element.classList.contains('selection')).to.eq(false);

        const noneSheet = createSheet({ selectionCopyDirection: 'none' });
        noneSheet.updateSelectionFromCoords(1, 0, 1, 0);
        dragFillHandleTo(noneSheet, 2, 2);
        expect(noneSheet.selection.length).to.eq(0);
        expect(noneSheet.records[0][2].element.classList.contains('selection')).to.eq(false);
        expect(noneSheet.records[1][1].element.classList.contains('selection')).to.eq(false);
    });

    it('double click autofill is allowed for both and vertical, blocked for horizontal and none', () => {
        const bothSheet = createSheet({ selectionCopyDirection: 'both' });
        bothSheet.updateSelectionFromCoords(0, 0, 0, 0);
        doubleClickFillHandle(bothSheet);
        expect(bothSheet.getValueFromCoords(0, 4)).to.eq('seed');

        const verticalSheet = createSheet({ selectionCopyDirection: 'vertical' });
        verticalSheet.updateSelectionFromCoords(0, 0, 0, 0);
        doubleClickFillHandle(verticalSheet);
        expect(verticalSheet.getValueFromCoords(0, 4)).to.eq('seed');

        const horizontalSheet = createSheet({ selectionCopyDirection: 'horizontal' });
        horizontalSheet.updateSelectionFromCoords(0, 0, 0, 0);
        doubleClickFillHandle(horizontalSheet);
        expect(horizontalSheet.getValueFromCoords(0, 4)).to.eq('');

        const noneSheet = createSheet({ selectionCopyDirection: 'none' });
        noneSheet.updateSelectionFromCoords(0, 0, 0, 0);
        doubleClickFillHandle(noneSheet);
        expect(noneSheet.getValueFromCoords(0, 4)).to.eq('');
    });

    it('updates corner visibility and cursor from initial config and runtime setConfig', () => {
        const hiddenSheet = createSheet({ selectionCopyDirection: 'none' });
        const hiddenCorner = hiddenSheet.corner;
        hiddenSheet.updateSelectionFromCoords(0, 0, 0, 0);
        expect(hiddenCorner.style.display).to.eq('none');

        const verticalSheet = createSheet({ selectionCopyDirection: 'vertical' });
        const corner = verticalSheet.corner;
        verticalSheet.updateSelectionFromCoords(0, 0, 0, 0);
        expect(corner.style.display).to.not.eq('none');
        expect(corner.style.cursor).to.eq('ns-resize');

        verticalSheet.setConfig({ selectionCopyDirection: 'horizontal' });
        expect(corner.style.display).to.not.eq('none');
        expect(corner.style.cursor).to.eq('ew-resize');

        verticalSheet.setConfig({ selectionCopyDirection: 'none' });
        expect(corner.style.display).to.eq('none');
        expect(corner.style.cursor).to.eq('');

        verticalSheet.setConfig({ selectionCopyDirection: 'vertical' });
        expect(corner.style.display).to.not.eq('none');
        expect(corner.style.cursor).to.eq('ns-resize');

        verticalSheet.setConfig({ selectionCopy: false });
        expect(corner.style.display).to.eq('none');
        expect(corner.style.cursor).to.eq('');
    });

    it('falls back to both when selectionCopyDirection is invalid', () => {
        const sheet = createSheet({ selectionCopyDirection: 'diagonal' });
        const corner = sheet.corner;

        sheet.updateSelectionFromCoords(0, 0, 0, 0);
        expect(jspreadsheet.helpers.getEffectiveCopyDirection(sheet.options)).to.eq('both');
        expect(corner.style.cursor).to.eq('crosshair');
    });
});
