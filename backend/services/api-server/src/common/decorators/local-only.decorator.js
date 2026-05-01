"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalOnly = exports.IS_LOCAL_ONLY_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.IS_LOCAL_ONLY_KEY = 'isLocalOnly';
const LocalOnly = () => (0, common_1.SetMetadata)(exports.IS_LOCAL_ONLY_KEY, true);
exports.LocalOnly = LocalOnly;
//# sourceMappingURL=local-only.decorator.js.map