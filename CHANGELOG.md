## 1.3.0 (2024-12-02)



---

## 1.2.0 (2024-11-29)

### 🔀 Miscellaneous 🔀

- Version bump forced for all

---

## 1.1.5-no-execa.0 (2024-11-26)

### 🚨 Breaking Changes 🚨

- feat!: dropped execa (d57019e1e936786e6fdb2dc4a6cda860735b1e0b)



### 🔀 Miscellaneous 🔀

- chore: added tests (e8613ebb32ffac5de61433510312cb9349ddfbd2)
- chore: removed dangling .only() and fixed high severity deps (ab6307b829f74ab24e2c162dca023a21ec945a00)

---

## 1.1.5-beta.0 (2024-11-22)

### 🛠️ Fixes 🛠️

- fix: use exact version instead of range operator when bumping prerelease or with a specific preif (82540ece06f1a6dab5e0ce8c40af408f8c9259c3)

---

## 1.1.4 (2024-07-16)

### 🔀 Miscellaneous 🔀

- Merge pull request #29 from artemdanylenko/adanylenko/monorepoBump (3c88d7e96f3bf9c424ea4e33084e67a64483920a)
- Fix typo (4189f16502ced298321a18cffec7ec4969e2225e)
- Do not regenerate the allPackages structure during the bumps synchronization (a883a5b2197d013c62342bd952c04118b8312f30)
- chore: bumped deps (8742aab0ad766ccc518068976b2f18b50406a4c4)

---

## 1.1.3 (2024-07-05)

### 🔀 Miscellaneous 🔀

- chore: export the releaseas presets enum (2b91651e0ea8a57b15750747179367920d65d7f3)

---

## 1.1.2 (2024-06-24)

### 🔀 Miscellaneous 🔀

- Merge pull request #25 from benduran/bduran/critical-bug-transitive-dep-updates (bd08331174f25690c84885acb976cf3c0378813b)



### 🛠️ Fixes 🛠️

- fix: apply missing bumps to deps for dependents (8f106cd4651aac0f6a2b2ff042c185a44364737b)

---

## 1.1.1 (2024-06-21)

### 🔀 Miscellaneous 🔀

- chore: bumped to latest eslint config and fixed issues that came up as a result (f0c0de676f633a0f48b79535ae89d54df37ed2e0)

---

## 1.1.0 (2024-06-19)

### 🔀 Miscellaneous 🔀

- Merge pull request #24 from benduran/bduran/#23-git-log-date-format (56589b0cc07500d0ce0210a34cdf49279f9232b9)
- chore: made the default date format 'iso-strict' (246957d35acc861d4c7eb324ce6fcf65da34a52f)



### ✨ Features ✨

- feat: added customizable date format for the git commits (86cb9bf8c62a25479c4473aa375a4866095ef5e7)

---

## 1.0.0 (2024-06-18)

### 🔀 Miscellaneous 🔀

- Merge pull request #22 from benduran/bduran/graph (a4091ce6f0171c22054af66968ce0b0be6cd3380)



### 🛠️ Fixes 🛠️

- fix: force flag now respects any computed bumps and doesn't automatically apply a PATCH bump unless one didn't exist (2864dd5c5a185cc1552978993f21facb55d1dd97)

---

## 0.8.5-beta.1 (2024-06-17)

### 🛠️ Fixes 🛠️

- fix: fixed type exports (5dfed9c7919f5809bbf3254c9be380736de8cfde)

---

## 0.8.5-beta.0 (2024-06-17)

### 🔀 Miscellaneous 🔀

- chore: changed typo of 'dependant' to 'dependent' (0564c45813f23b3bf8d42c3ff78b3e01443c5c13)
- chore: newt hotness logic for computing transitive bumps also fixed a bug that would cause parent MAJOR bumps to not get applied to the children, yay! (5337da2894050bde004f2e642eed2f0dc62df830)
- chore: started making tweaks to creating the dep graph (853faf59b81ca998714202e97f76525bdb5a1721)
- chore: fixed tests (77f3a56e65e1fa02cefd0036ff8654ba7f1b3626)
- chore: migrated last files to typescript (99a4974787d60db4ea405b829b2f32b940fc4287)



### ✨ Features ✨

- feat: improved package.json graph parsing and added cycle detection (8850482f3612742e5796f28629582013beee48b0)
- feat: improved logic for getting local dep graph (16056ab223a241ac88c9d652c680d4b9676f2e15)



### 🚨 Breaking Changes 🚨

- feat!: started converting things to typescript (3d1dc2cd1b51e75bd3e798efa9599c77065a2941)

---

## 0.8.4 (2024-04-25)

### 🔀 Miscellaneous 🔀

- Merge pull request #20 from brucespang/bspang/fix-saveExact (9bb3ce518ed67b86391e2fdb1e7d20f1bfd59393)



### 🛠️ Fixes 🛠️

- fix: add pnpm to dev dependencies so that tests run (a1c16257c3e3db4e589576122f129f4564a31ca2)
- fix: pass saveExact through applyRecommendedBumpsByPackage (6de070d3483e7ca2e585f4ae738d00ef6bd0ff7c)

---

## 0.8.3 (2024-04-24)

### 🔀 Miscellaneous 🔀

- Merge pull request #19 from artemdanylenko/adanylenko/saveExact (b2a501211acb5131b1a373b0b339331cc11e9c41)
- Add option to saveExact when applying bumps inside the monorepo (6e169631f12185c34042d71236f430d3f0e5f9fd)

---

## 0.8.2 (2023-12-05)

### 🔀 Miscellaneous 🔀

- Merge pull request #18 from artemdanylenko/adanylenko/allChanges (44a1a098f2fcf29301bd5b55348303cd69d46bee)
- Allow changeLogEntryFormatter access to all updates in the package tree (ad1e92051dc59ad1af86bc093de6015b96d32655)

---

## 0.8.1 (2023-12-04)

### 🔀 Miscellaneous 🔀

- Merge pull request #17 from artemdanylenko/adanylenko/parentBump (ad0970a61735e58f17c8a58e0a1ea42f35ad22bb)
- Allow traversing from BumpRecommendation to its parents for the recursive package bumps (a169aeafb9af7d875b184c28c72940aa01c34352)

---

## 0.8.0 (2023-10-20)

### 🔀 Miscellaneous 🔀

- Merge pull request #15 from benduran/bduran/fix-changelog-default-line-formatter (ebb77944109a9932bafce50d0238a85cc6ed070f)
- chore: removed debugging line (fdfc4b84d2071179da1a0f87c02aa63fd41d40d2)



### 🛠️ Fixes 🛠️

- fix: changelog line default formatter used the wrong default field (0fc702314d7169117ce1e75690928be967ec291c)

---

## 0.7.6 (2023-10-16)

### 🔀 Miscellaneous 🔀

- Merge pull request #14 from artemdanylenko/adanylenko/author (0fcc5abd0f783e1d74be8aa823c8383829ea6683)
- Add ability to use author/email in the changelog formatter (e1b6ef8b9a3576a5bb1099a8f17056569faf092f)

---

## 0.7.5 (2023-10-09)

### 🔀 Miscellaneous 🔀

- changing between alpha and beta doesn't respect the changeover (d29635fa7979694bbb34f5c4ecc8a35d6c6fa28c)
- always use the existing comparison logic if there's not a valid release type detected for some reason (f5fd0af7b83779371cea7e11156a6bc484bdddd3)



### 🛠️ Fixes 🛠️

- changing between alpha and beta doesn't respect the changeover (82bbb2e3a429d15d970af098ad587e663f833f1c)

---

## 0.7.4 (2023-09-28)

### 🔀 Miscellaneous 🔀

- Merge pull request #12 from benduran/bduran/no-push-not-respected (86ffbb31113d895abc23ff87f450d261f8d784e8)



### 📖 Docs 📖

- removed my CWD lol (1c678271a5854123d048239c933513f6efbf4f65)
- updated readme. also added 'private' marker to package printouts (847476d8c8d984a2801c59f583ff5055c3adedfa)

---

## 0.7.4-beta.1 (2023-09-28)

### ✨ Features ✨

- added 'noInstall' flag to opt-into avoiding npm install after the version bump operation (9431a6d2ee4db73f312effb923e65fedd9c49acc)

---

## 0.7.4-beta.0 (2023-09-28)

### 🛠️ Fixes 🛠️

- nopush and nocommit are not properly respected (65e5f53229d4762c412bda5e33f468ad0115248d)

---

## 0.7.3 (2023-09-28)

### 🔀 Miscellaneous 🔀

- Merge pull request #11 from artemdanylenko/adanylenko/branch (ac9375e911e63e14cf6c5b007d2048110cf6ea9e)
- Fix interface name (5de22f688b5f192fa61e8740ba919563c883b63d)
- Add changed-packages-since-branch and changed-files-since-branch commands (baab27ec6dc2698b4f0475715692ba2532b27940)

---

## 0.7.2 (2023-09-19)

### 🔀 Miscellaneous 🔀

- Merge pull request #10 from benduran/bduran/better-error-message (e5303ac1a3c04d3bb0ebd120f3a1fe9c81a9d5b4)

---

## 0.7.2-beta.1 (2023-09-19)

### 🔀 Miscellaneous 🔀

- added which command failed (6d3b723a653ed53da3e9d2f6889e9b5c5a14c4cc)

---

## 0.7.2-beta.0 (2023-09-19)

### 🔀 Miscellaneous 🔀

- make error message not print help menu for cleaner CLI errors (b2ddd76dd2553e9b0e379146681bf6bb8303ed13)

---

## 0.7.1 (2023-07-26)

### 🔀 Miscellaneous 🔀

- enhanced cmd to print all files changed by package (8057ef6d882e700c6c9a3fa95d26473866e25661)

---

## 0.7.1-beta.0.d831ecc (2023-07-26)

### 🛠️ Fixes 🛠️

- fixed filtering of changes files by SHA to scope by the respective package (d831eccaa98137aace3c61bbd5d749c3b61835e9)



### ✨ Features ✨

- enhanced cmd to print all files changed by package (6b2cb13aefc744e6a9d92b44b8a72f665344dcd4)

---

## 0.7.0 (2023-07-21)

### 🔀 Miscellaneous 🔀

- fixed noCommit grammar (b56f14c304ecbee5c22123ea9614dca75eb9b1c7)
- adding a noCommit flag to avoid committing any changes (47659258857a851283f55abc71bf14b4ea5562f1)



### ✨ Features ✨

- adding a noCommit flag to avoid committing any changes (9dc95f4a6aa6501f7465c7f78135c4afac1b53d9)

---

## 0.6.1 (2023-06-30)

### 🔀 Miscellaneous 🔀

- Merge pull request #7 from benduran/bduran/dont-overload-git (b7a95ac9177aec43299c1f25e9f80fd93defdd06)

---

## 0.6.1-beta.1 (2023-06-28)

### 🛠️ Fixes 🛠️

- moved certain git operations to be synchronous to allow for easier caching and deduplication (e7a9c39affce692da61bd9e2bd0003b34893b42e)

---

## 0.6.0 (2023-06-20)

### ✨ Features ✨

- allow for creating a git commit even when working dir is unclean (4686f6b715ecb765ce28a33a6000dd1876278897)

---

## 0.5.1 (2023-06-19)

### 📖 Docs 📖

- updated readme (df7ac73f8c831de411bf58d061395dbfa42668a4)

---

## 0.5.0 (2023-06-16)

### ✨ Features ✨

- added command to visualize the local dep graph (984b4b05c28e2f11af6f9e6291082011c33ad6d2)



### 📖 Docs 📖

- updated readme (82ea354f929f38f276ddcede7908e0588e75b8ae)

---

## 0.4.1 (2023-06-16)

### 🔀 Miscellaneous 🔀

- addressed final PR feedback (db0bd6830e62fc4b5548c35ea194d9691fe2b318)

---

## 0.4.1-beta.4 (2023-06-15)

### 🛠️ Fixes 🛠️

- fixed bug that wouldn't return ALL the bumps, including transitive ones (c016087f4c6091f08ac0c0731e6d700d73e4ee53)
- fixed writing package.json files emitting blank files (bd43f36b0ba69cf066fb3b2c4dae8dcf31541593)



### 🔀 Miscellaneous 🔀

- moved to using execSync when running NPM install (f04d1deb23584c3a2139bea0a3c0ac271581ebe1)

---

## 0.4.1-beta.3 (2023-06-15)

### 🔀 Miscellaneous 🔀

- responded to PR feedback and added a custom rollup formatter (36673916a728592807c826d939f7a47029bb6f39)

---

## 0.4.1-beta.2 (2023-06-14)

### 🔀 Miscellaneous 🔀

- added ability to provide custom config specifically to the apply-bumps fnc (3038dfde8b308fce9533bc4e639595efd388323b)

---

## 0.4.1-beta.1 (2023-06-14)

### 🛠️ Fixes 🛠️

- fixed missing config-related exports (b6d70497a93042fab53da216c6d93791a2b658b4)

---

## 0.4.1-beta.0 (2023-06-14)

### 🚨 Breaking Changes 🚨

- moved to reading a letsVersion.config.mjs file (d236d5ddb51aa108871f9c3ec5de61dd4d021424)



### 🔀 Miscellaneous 🔀

- Merge remote-tracking branch 'origin/main' into bduran/rollup-changelog (341c6a68406d40ec36c6a549cad16ea3378bf58f)
- add a flag to allow users to customize the entry cha… (9d84faba7e68f5b18895b0a88095b9455a20adf8)
- moved to a data structure to handle the aggregate view of the hangelog (6de6cd99a867284d170dc4e3f987ec0004aa2cc0)
- tweaked the markdown header (faa3cddd1e8ca46e0c81ec78a5d5bb110f2ce126)
- removed some extraneous files from the build (07b3636a5095b24a8aba08af171f7f7674ced9b2)



### ✨ Features ✨

- add a flag to allow users to customize the entry changelog entry (a5f0b857890e168ccb63f5620de9fb6d81a9c95a)

---

## 0.4.0 (2023-06-13)

### 🔀 Miscellaneous 🔀

- Merge pull request #3 from jgodi/main (75f9993131ee3785bc5aa7828861bcdf2555929d)



### ✨ Features ✨

- adding a way to pass a custom line formatter to the changelog (95ae0a5725abd0610770e80f704cdb5dd1a90f94)

---

## 0.3.0 (2023-06-09)

### 🔀 Miscellaneous 🔀

* Version Bump (cb1629050af013d55a40cb8f460cff07c51ec854)
* removed the sleep and warm up tags cache for perf reasons (e54cb0b4f8a659724b9e7182ecb687b147bad481)
* Version Bump (56aefb09cf6d1e885f5b4d3a2a9f41f26c9c52e3)
* Version Bump (1f3faf0c7dc7422e4c570c78479ed02294c6ec2a)



### ✨ Features ✨

* chunk tag pushing operation for better performance (78e0a5c04350752a7dbde89d6c470aba933cdadf)



### 🛠️ Fixes 🛠️

* sleep before applying bumps and don't fail on npm install (39c69832f2460a9965aff946dc0b34718c677928)

---

## 0.2.1 (2023-06-09)

### 🔀 Miscellaneous 🔀

* Version bumped exactly to 0.2.1
## 0.2.1-beta.2 (2023-06-09)

### 🔀 Miscellaneous 🔀

* removed the sleep and warm up tags cache for perf reasons (e54cb0b4f8a659724b9e7182ecb687b147bad481)

---

## 0.2.1-beta.1 (2023-06-09)

### ✨ Features ✨

* chunk tag pushing operation for better performance (78e0a5c04350752a7dbde89d6c470aba933cdadf)

---

## 0.2.1-beta.0 (2023-06-09)

### 🛠️ Fixes 🛠️

* sleep before applying bumps and don't fail on npm install (39c69832f2460a9965aff946dc0b34718c677928)

---

## 0.2.0 (2023-06-07)

### 📖 Docs 📖

* updated readme again (d1cda645ba33a7923b71d927f0f9f58cff781e13)
* updated readme (b3e7ff865ffddbc352eecb37944e0d9523fea884)



### 🔀 Miscellaneous 🔀

* added a bunch of variants of dummy projects (fb53c7139555e60486b5729233bd566dcf8db9de)
* added yarn single package project (91e5d6ddbc227775add52fc905828034eded4e5d)
* added PNPM dummy project (aaa61ac3f40003c5cff5203831695f3641f7a39e)
* added single npm project sample (c72e0eea589f6fb6fdd437dbda74bca90e417ed9)
* added single package dummy project (7838906184906d32a3ddbf7a9b7fa4df38eba7b8)
* added CWD test coverage (b51b55ce2895ec588029e225257e8547edaa9653)
* added test coverage reporting (5d2eb71ed09cc5252aab15ce1d581c7d829c47fe)

---

## 0.1.2-beta.7 (2023-06-07)

### ✨ Features ✨

* added ability to add a unique git hash to the versions (6aa88522be1e33ef30a3e52169e8e8615388104d)

---

## 0.1.2-beta.6 (2023-06-02)

### 🛠️ Fixes 🛠️

* bug where releaseAs wasn't being respected and used as a preid (001d2efd15f1400e28e53af0e0a218b86566218d)

---

## 0.1.2-beta.5 (2023-06-02)

### 🔀 Miscellaneous 🔀

* added version bump logic tests (31fd6bdf42d7765e4b49c91a476d9b73318cfc3e)
* Merge branch 'main' into bduran/tests (691a208013d59a7aa42606ece99bae13c18d6887)
* added changelog tests (ac5f7fa4485ac57899963f2481699b71d6d7627a)

---

## 0.1.2-beta.4 (2023-06-01)

### 🔀 Miscellaneous 🔀

* revert unshallowing and print warning instead (28523f199c262edab64eefab1f0d1624e5dffa1a)
* force bump (f5309af5d7369710c4ae2646be88cd4f1c92b4c2)

---

## 0.1.2-beta.3 (2023-05-31)

### ✨ Features ✨

* cache fetch operations to a single per bump operation execution (71c9e7bd22d3f7350f1011d9e88a27c58931eaca)

---

## 0.1.2-beta.2 (2023-05-31)

### 🛠️ Fixes 🛠️

* unshallow a shallow clone and fetch all remote info (c5ad94c01517b12efe85c35b4fc2b9a1590206a2)

---

## 0.1.2-beta.1 (2023-05-30)

### 🔀 Miscellaneous 🔀

* make git pull operations quieter (954b8d4f2dba06578438e4218bfba37d8a397aa0)

---

## 0.1.2-beta.0 (2023-05-30)

### 🔀 Miscellaneous 🔀

* Version Bump (3cde96548abd68b278fe1b143ad5303519183853)
* Merge pull request #2 from benduran/bduran/sleep-before-install (e4321cf58a3c687f2e2104785b7514827afdef4e)
* Version Bump (4b43c25d66f7daa31a9401b2f9fe4fcb661b185f)
* Version Bump (8a4b7a013501ada461842fb2f21a32a754d48d14)
* Version Bump (71e9b441b0a4ad061e5d12d60e27b04b6c7ec1f8)
* fixed fetch command (80314456698266dcdaffd1e3e1f81e0a0e9a7434)
* Version Bump (479ac885f883b4d4a58232b4092ed9d835099342)
* Version Bump (849a87c3a3e6dccdd8f88ab11ae245ffa89d9399)
* Version Bump (9b2f6761a0e0904a4090acd53901164992377bca)
* Version Bump (e3a4084089d4d6c9a947e5266fc8738544942581)
* Version Bump (59a5c23d8eeabe4141a19cfea6a242480e3f6ca5)
* Version Bump (12387739f32a7ce134e5bbfee24931df92e1f886)
* Version Bump (ebb334ba1d37d200ca2d42f731d66e042860c672)
* Version Bump (82854a63ba50ada420b3d31a864a1b50b15a605a)
* Merge pull request #1 from benduran/bduran/dep-graph-traversal (2671c5c2a0662d2e6824ab23c0d72d96586597a9)
* run tests before committing (072a970995a57699c235b04119f05954fa53d841)
* started adding tests (724912e0256f8f467cac9f061822a7f22d717ce7)
* Version Bump (817feac84eb71d292a35b0adc4c56fef2ca3330e)
* Version Bump (d211599bfc73187d2e8ae82aaf1afc39f81a4102)
* Version Bump (1230ca43246188fcf2df92705e4a57cad5355300)
* updated docs and switched package type to 'module' (eb2a82cb7a31c7607a8f5a9c209fc306f6528c09)
* Version Bump (674e7eb9a572f56b12ff914e3c4b4a753d75b109)
* run install with PM after bumps (30f98b97b2656492eb4407cf176906c823169e85)



### 🛠️ Fixes 🛠️

* workaround NPM bug with double npm installs (bd1254af438f94eedb5c3e44ad90bb2903787512)
* sleep a few seconds until npm install (1cd652ee9683137d23b9af35a5d3820d1403a0d1)
* updated all JS file extensions (e9f0ab9a3d772582f9c6a96571339fbfb7afb5cd)
* fixed exports again (b4cbba14b84bcb2c0b3470c2a5a28b7d087a409d)
* fixed module exports (f1ebc5f629b78028fbcaefc661a1e4aacdb00930)
* fixed return types (b8213a028f07676a13db80f7c0a889b4beec8fb0)
* fixed package.json files not flushing to disk (b05062b6e8911d17defe19b69b69b43d7770a739)
* added better changelog messaging (e84aa3d5501bba2029a952542c6d9c5dc2843e74)
* fixed breaking change detection (6ae93c834a0609b6dac46f1a8c9a153a00150a3e)
* fixed git tag bug (95141aa62280f89ddf085a19073ac460fdacddf7)
* fixed dryrun logging (596d4ffc7d3a951dd982ca2dc1bd6620eda0e140)
* push only the tags that were created to upstream (e81305c154305a757ffa41e71281fd66bb38f9eb)
* fixed missing dep (aa9219f3ce659a32de3ea1188d4dc88cf295efe1)
* fixed missing shebang on the cli.mjs file (ddfd53fb875f7e8ae2a324c027a2b4ba93b19211)
* push tags, in addition to commits (1ac87dd79dcce284d0a438f599fdab5af94e3faa)
* fixed typing exports wrong path (7dd136b2ebe09eefc81001f4ee7fa3a165d9b5bf)



### ✨ Features ✨

* added auto fetching of all information from remote (cc5af205480f2262fa084a9d9e56ec39e55c0ebf)
* made two bump-related functions have the same return type (d38bd8e878ed5330b84af00ea2dc2b8275ccfcef)
* added releaseAs and autosync (a8824c62d404390af2b420384eaeace9f5e4941a)
* added dependency graph changes (b2f3b3ca335ccfd4141f834784c96c2f3a691946)
* added changelog generation on bump application (b162da0a860466e23a4dc7d839b36b9c5b2a4564)
* added dry runs (908d14ef848bc6717321d4276203ef48318e73b3)

---

## 0.1.1-beta.1 (2023-05-30)

### 🔀 Miscellaneous 🔀

* Merge pull request #2 from benduran/bduran/sleep-before-install (e4321cf58a3c687f2e2104785b7514827afdef4e)

---

## 0.1.1-oneoff.1 (2023-05-30)

### 🛠️ Fixes 🛠️

* workaround NPM bug with double npm installs (bd1254af438f94eedb5c3e44ad90bb2903787512)

---

## 0.1.1-oneoff.0 (2023-05-30)

### 🛠️ Fixes 🛠️

* sleep a few seconds until npm install (1cd652ee9683137d23b9af35a5d3820d1403a0d1)

---

## 0.1.1-beta.14 (2023-05-30)

### 🔀 Miscellaneous 🔀

* fixed fetch command (80314456698266dcdaffd1e3e1f81e0a0e9a7434)



### ✨ Features ✨

* added auto fetching of all information from remote (cc5af205480f2262fa084a9d9e56ec39e55c0ebf)

---

## 0.1.1-beta.13 (2023-05-30)

### 🔀 Miscellaneous 🔀

* Version bump forced for all

---

## 0.1.1-beta.12 (2023-05-30)

### 🛠️ Fixes 🛠️

* updated all JS file extensions (e9f0ab9a3d772582f9c6a96571339fbfb7afb5cd)

---

## 0.1.1-beta.11 (2023-05-30)

### 🛠️ Fixes 🛠️

* fixed exports again (b4cbba14b84bcb2c0b3470c2a5a28b7d087a409d)

---

## 0.1.1-beta.10 (2023-05-30)

### 🛠️ Fixes 🛠️

* fixed module exports (f1ebc5f629b78028fbcaefc661a1e4aacdb00930)

---

## 0.1.1-beta.9 (2023-05-29)

### 🛠️ Fixes 🛠️

* fixed return types (b8213a028f07676a13db80f7c0a889b4beec8fb0)

---

## 0.1.1-beta.8 (2023-05-29)

### ✨ Features ✨

* made two bump-related functions have the same return type (d38bd8e878ed5330b84af00ea2dc2b8275ccfcef)

---

## 0.1.1-beta.7 (2023-05-29)

### ✨ Features ✨

* added releaseAs and autosync (a8824c62d404390af2b420384eaeace9f5e4941a)

---

## 0.1.1-beta.6 (2023-05-29)

### 🛠️ Fixes 🛠️

* fixed package.json files not flushing to disk (b05062b6e8911d17defe19b69b69b43d7770a739)
* added better changelog messaging (e84aa3d5501bba2029a952542c6d9c5dc2843e74)
* fixed breaking change detection (6ae93c834a0609b6dac46f1a8c9a153a00150a3e)
* fixed git tag bug (95141aa62280f89ddf085a19073ac460fdacddf7)
* fixed dryrun logging (596d4ffc7d3a951dd982ca2dc1bd6620eda0e140)



### 🔀 Miscellaneous 🔀

* Merge pull request #1 from benduran/bduran/dep-graph-traversal (2671c5c2a0662d2e6824ab23c0d72d96586597a9)
* run tests before committing (072a970995a57699c235b04119f05954fa53d841)
* started adding tests (724912e0256f8f467cac9f061822a7f22d717ce7)



### ✨ Features ✨

* added dependency graph changes (b2f3b3ca335ccfd4141f834784c96c2f3a691946)
* added changelog generation on bump application (b162da0a860466e23a4dc7d839b36b9c5b2a4564)
* added dry runs (908d14ef848bc6717321d4276203ef48318e73b3)

---

dry runs (908d14ef848bc6717321d4276203ef48318e73b3)

---

