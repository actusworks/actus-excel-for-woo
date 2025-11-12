import ExportSheet 		from './export-sheet.js';
import ImportSheet 		from './import-sheet.js';
import LicenseManager   from './license.js';
import History   		from './history.js';
// -----------------------------------------------------

const $ = window.jQuery || jQuery;
const DATA = window.acex_phpDATA || {}
const STR = DATA.strings || {};
// -----------------------------------------------------


 




// -----------------------------------------------------
const IFC = {}


// Track active components
IFC.activeComponents = {
    exportSheet: null,
    importSheet: null,
};





// MARK: Initialization
// -----------------------------------------------------
IFC.init = async () => {
	
	IFC.navigation();
	$('.actus-admin-nav-button').first().trigger('click');


    //await LicenseManager.check()


    // Add cleanup on page unload/navigation
    window.addEventListener('beforeunload', IFC.cleanupAll);

}



// Cleanup all active components
// -----------------------------------------------------
IFC.cleanupAll = () => {
    console.log('Cleaning up all components...');
    
    Object.keys(IFC.activeComponents).forEach(key => {
        const component = IFC.activeComponents[key];
        if (component && typeof component.cleanup === 'function') {
            console.log(`Cleaning up ${key}`);
            component.cleanup();
        }
        IFC.activeComponents[key] = null;
    });
}




// MARK: Navigation
// -----------------------------------------------------
IFC.navigation = () => {

	// Add your navigation logic here
	$('.actus-admin-nav-button').on('click', function() {
		const target = $(this).attr('alt')
		//console.log("Navigation to: " + target);

        // Cleanup components when switching away from them
        if (target !== 'export' && IFC.activeComponents.exportSheet) {
            if (typeof IFC.activeComponents.exportSheet.cleanup === 'function') {
                IFC.activeComponents.exportSheet.cleanup();
            }
            IFC.activeComponents.exportSheet = null;
        }
        
        if (target !== 'import' && IFC.activeComponents.importSheet) {
            if (typeof IFC.activeComponents.importSheet.cleanup === 'function') {
                IFC.activeComponents.importSheet.cleanup();
            }
            IFC.activeComponents.importSheet = null;
        }

        if (target !== 'history' && IFC.activeComponents.history) {
            if (typeof IFC.activeComponents.history.cleanup === 'function') {
                IFC.activeComponents.history.cleanup();
            }
            IFC.activeComponents.history = null;
        }

        if (target !== 'license' && IFC.activeComponents.license) {
            if (typeof IFC.activeComponents.license.cleanup === 'function') {
                IFC.activeComponents.license.cleanup();
            }
            IFC.activeComponents.license = null;
        }


        // Update active state
		$('.actus-admin-nav-button').removeClass('actus-active');
		$(this).addClass('actus-active');
		
        // Initialize requested component
		if ( target == 'home' ) {
			document.querySelector('.actus-admin-main').innerHTML = '';
		}
		//if ( target == 'home' ) AdminHome();
        if (target == 'export') {
            ExportSheet.init();
            // Store reference to active component
            IFC.activeComponents.exportSheet = ExportSheet;
        }
        
        if (target == 'import') {
            ImportSheet.init();
            // Store reference to active component
            IFC.activeComponents.importSheet = ImportSheet;
        }
        
        if (target == 'history') {
            History.init( $('.acex-main') );
            // Store reference to active component
            IFC.activeComponents.history = History;
        }

        if (target == 'license') {
            LicenseManager.start();
            IFC.activeComponents.license = LicenseManager;
        }

	});

}


// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    Object.values(IFC.activeComponents).forEach(component => {
        component?.cleanup?.();
    });
});


















// -----------------------------------------------------
export default IFC;

