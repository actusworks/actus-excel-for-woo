 
const acexPrefs = localStorage.getItem('acex_preferences');
window.acex_phpDATA.prefs = acexPrefs ? JSON.parse(acexPrefs) : {};
window.acex_phpDATA.prefs.save = () => {
	const newPrefs = {...window.acex_phpDATA.prefs};
	delete newPrefs.save; // Remove the save function before saving
	localStorage.setItem('acex_preferences', JSON.stringify(newPrefs));
	//console.warn('Preferences saved:', newPrefs);
}


//console.log('ACEX INIT', window.acex_phpDATA.prefs)

// -----------------------------------------------------
import LicenseManager   from './license.js';
import IFC 				from './interface.js';
import ExportToExcel 	from './export-to-excel.js';
import ExportTemplates 	from './export-templates.js';
import SelectProducts 	from './select-products.js';
import GoogleSheets 	from './google-sheets.js';
import Modal 			from './Modal.js';
// -----------------------------------------------------





const DATA = window.acex_phpDATA || {};
const STR = DATA.strings || {};
const LIMIT = 100
const { __ } = wp.i18n;
// -----------------------------------------------------
//console.log('ACEX', DATA );


ActusWooExcel();
async function ActusWooExcel() {

    await LicenseManager.init();
    IFC.init()

	//await GoogleSheets.disconnect()
	//await GoogleSheets.acexCallback()
	//let res = await GoogleSheets.isConnected()



}




