import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth/auth.interceptor';
import { provideRouter } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { 
  heroHome, 
  heroDocumentText, 
  heroTableCells, 
  heroPhoto, 
  heroUserPlus,
  heroUsers,
  heroPlus,
  heroPencilSquare,
  heroTrash,
  heroMagnifyingGlass,
  heroCloudArrowUp,
  heroXMark,
  heroPhoto as heroPhotoIcon,
  heroDocumentArrowUp,
  heroChevronDown,
  heroChevronUp,
  heroUser,
  heroShieldCheck,
  heroCheckCircle,
  heroXCircle,
  heroArrowLeft,
  heroDocumentArrowDown,
      heroArrowsPointingOut,
      heroCog6Tooth,
      heroCodeBracket,
      heroChevronRight
} from '@ng-icons/heroicons/outline';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIcons({ 
      heroHome, 
      heroDocumentText, 
      heroTableCells, 
      heroPhoto, 
      heroUserPlus,
      heroUsers,
      heroPlus,
      heroPencilSquare,
      heroTrash,
      heroMagnifyingGlass,
      heroCloudArrowUp,
      heroXMark,
      heroPhotoIcon,
      heroDocumentArrowUp,
      heroChevronDown,
      heroChevronUp,
      heroUser,
      heroShieldCheck,
      heroCheckCircle,
      heroXCircle,
      heroArrowLeft,
      heroDocumentArrowDown,
      heroArrowsPointingOut,
      heroCog6Tooth,
      heroCodeBracket,
      heroChevronRight
    })
  ]
};
