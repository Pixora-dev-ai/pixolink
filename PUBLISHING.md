# Publishing Guide - PixoLink SDK

## 🚀 Pre-Publishing Checklist

All critical issues have been resolved:

- ✅ MIT License file created
- ✅ All package versions aligned to v1.0.0
- ✅ README files created for all 7 packages
- ✅ `files` field added to all packages
- ✅ Complete package.json metadata (repository, author, keywords)
- ✅ `publishConfig: { access: "public" }` added to all packages
- ✅ CHANGELOG.md created
- ✅ Build successful (all packages compiled)
- ✅ Dry-run test passed

## 📦 Ready to Publish

The following packages are ready for npm publication:

1. **@pixora/pixolink** (v1.0.0) - Core SDK
2. **@pixora/pixolink-admin-dashboard** (v1.0.0)
3. **@pixora/pixolink-intelligence-core** (v1.0.0)
4. **@pixora/pixolink-logic-guardian** (v1.0.0)
5. **@pixora/pixolink-pixoguard** (v1.0.0)
6. **@pixora/pixolink-pixopay** (v1.0.0)
7. **@pixora/pixolink-weavai** (v1.0.0)

## 🔐 Authentication Required

Before publishing, you need to authenticate with npm:

```bash
# Login to npm
npm login

# Verify your identity
npm whoami

# Check access to @pixora scope
npm access ls-packages @pixora
```

## 📤 Publishing Commands

### Option 1: Publish All Packages (Recommended)

```bash
cd /Users/mamdouhaboammar/Downloads/pixora---your-personal-ai-artist/pixolink

# Using pnpm (handles workspace dependencies correctly)
pnpm publish -r --access public --no-git-checks

# Or using Turborepo for better control
pnpm turbo run publish
```

### Option 2: Publish Individually

```bash
# Publish in correct order (core first, then modules)

# 1. Core package
cd packages/core
npm publish --access public

# 2. Modules (can be done in parallel)
cd ../modules/admin-dashboard
npm publish --access public

cd ../intelligence-core
npm publish --access public

cd ../logic-guardian
npm publish --access public

cd ../pixoguard
npm publish --access public

cd ../pixopay
npm publish --access public

cd ../weavai
npm publish --access public
```

## 🧪 Test Installation After Publishing

```bash
# Create test directory
mkdir /tmp/pixolink-test && cd /tmp/pixolink-test
npm init -y

# Test core package
npm install @pixora/pixolink

# Test modules
npm install @pixora/pixolink-admin-dashboard
npm install @pixora/pixolink-pixopay
npm install @pixora/pixolink-weavai

# Verify imports
node -e "const pixolink = require('@pixora/pixolink'); console.log('✅ Core loaded');"
```

## 📊 Post-Publishing Verification

1. **Check npm registry:**
   ```bash
   npm view @pixora/pixolink
   npm view @pixora/pixolink-admin-dashboard
   ```

2. **Verify package pages:**
   - https://www.npmjs.com/package/@pixora/pixolink
   - https://www.npmjs.com/package/@pixora/pixolink-admin-dashboard
   - https://www.npmjs.com/package/@pixora/pixolink-intelligence-core
   - https://www.npmjs.com/package/@pixora/pixolink-logic-guardian
   - https://www.npmjs.com/package/@pixora/pixolink-pixoguard
   - https://www.npmjs.com/package/@pixora/pixolink-pixopay
   - https://www.npmjs.com/package/@pixora/pixolink-weavai

3. **Check bundle sizes:**
   ```bash
   npm view @pixora/pixolink dist.tarball | xargs curl -sL | tar -tz
   ```

## 🎯 Next Steps After Publishing

1. **Tag the release in Git:**
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **Create GitHub Release:**
   - Go to: https://github.com/pixora/pixolink/releases/new
   - Tag: v1.0.0
   - Title: PixoLink SDK v1.0.0
   - Description: Copy from CHANGELOG.md

3. **Update documentation:**
   - Add installation instructions to main README
   - Update docs site with new package links
   - Create migration guide if needed

4. **Announce:**
   - Social media
   - Discord/Slack channels
   - Blog post
   - Email newsletter

## 🚨 If Something Goes Wrong

### Unpublish (within 72 hours only)
```bash
npm unpublish @pixora/pixolink@1.0.0
```

### Deprecate a version
```bash
npm deprecate @pixora/pixolink@1.0.0 "Please use v1.0.1 instead"
```

### Publish a patch
```bash
# Increment version
npm version patch

# Publish again
npm publish --access public
```

## 📝 Notes

- **Package sizes:**
  - Core: ~34 KB (gzipped)
  - Modules: ~5-15 KB each

- **Total downloads after publish:**
  - Core will be installed automatically when modules are used
  - Monitor with: `npm view @pixora/pixolink downloads`

- **Scoped packages:**
  - All packages are under `@pixora` scope
  - Ensure you have access rights to this scope
  - Contact npm support if scope doesn't exist

## ⚠️ Important Warnings

1. **Cannot unpublish after 72 hours**
2. **Cannot reuse version numbers**
3. **Be careful with breaking changes**
4. **Test in staging/dev environment first**

## 🔗 Useful Links

- npm CLI docs: https://docs.npmjs.com/cli/v10/commands/npm-publish
- Publishing scoped packages: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages
- Semantic versioning: https://semver.org/

---

**Status:** ✅ All pre-publish checks completed. Ready to authenticate and publish!

**Last Updated:** November 17, 2025
