import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import getDotaPath from './getDotaPath';
import config from './addon.config';

(async () => {
    if (process.platform !== 'win32') {
        console.log('This script runs on windows only, Addon Linking is skipped.');
        return;
    }

    const dotaPath = await getDotaPath();
    if (dotaPath === undefined) {
        console.log('No Dota 2 installation found. Addon linking is skipped.');
        return;
    }

    for (const directoryName of ['game', 'content']) {
        const sourcePath = path.resolve(__dirname, '..', directoryName);
        assert(fs.existsSync(sourcePath), `Could not find '${sourcePath}'`);

        const targetRoot = path.join(dotaPath, directoryName, 'dota_addons');
        assert(fs.existsSync(targetRoot), `Could not find '${targetRoot}'`);

        const targetPath = path.join(dotaPath, directoryName, 'dota_addons', config.addon_name);

        // 检查 sourcePath 是否仍是 junction（旧版布局需要迁移）
        if (fs.lstatSync(sourcePath).isSymbolicLink()) {
            const oldTarget = fs.realpathSync(sourcePath);
            console.log(`'${sourcePath}' is a junction to '${oldTarget}' (old layout). Migrating...`);

            // 如果 Dota2 目录已经指向正确的 source，直接解除 source 的 junction
            if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isSymbolicLink() && fs.realpathSync(targetPath) === sourcePath) {
                console.log(`'${targetPath}' already points back to project. Removing old junction...`);
                await fs.remove(sourcePath);
            } else {
                // 旧布局：source 是 junction → Dota2 目录
                // 需要解除旧 junction，恢复 source 为真实目录
                await fs.remove(sourcePath);
            }

            // 从 git 恢复 source 为真实目录
            console.log(`Restoring '${sourcePath}' from git...`);
            execSync(`git checkout HEAD -- "${sourcePath}"`, { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });

            if (!fs.existsSync(sourcePath)) {
                console.error(`Failed to restore '${sourcePath}' from git. Please run: git checkout HEAD -- ${directoryName}`);
                continue;
            }

            console.log(`Restored '${sourcePath}' as a real directory.`);
        }

        // 新布局：Dota2 目录 junction → 项目目录（source of truth）
        if (fs.existsSync(targetPath)) {
            const isCorrect = fs.lstatSync(targetPath).isSymbolicLink() && fs.realpathSync(targetPath) === sourcePath;
            if (isCorrect) {
                console.log(`Skipping '${targetPath}' since it is already linked to the project.`);
                continue;
            }

            // targetPath 存在但不是指向 sourcePath 的 junction
            const targetStat = fs.lstatSync(targetPath);
            if (targetStat.isSymbolicLink()) {
                console.log(`'${targetPath}' is a junction to '${fs.realpathSync(targetPath)}', relinking to project...`);
            } else {
                console.log(`'${targetPath}' is a real directory, backing up and creating junction...`);
                const backupPath = `${path.resolve(__dirname, '..', directoryName)}.backup.${Date.now()}`;
                fs.moveSync(targetPath, backupPath);
                console.log(`Backed up old '${targetPath}' to '${backupPath}'`);
            }

            await fs.remove(targetPath);
            fs.symlinkSync(sourcePath, targetPath, 'junction');
            console.log(`Linked ${targetPath} <==> ${sourcePath}`);
        } else {
            fs.symlinkSync(sourcePath, targetPath, 'junction');
            console.log(`Linked ${targetPath} <==> ${sourcePath}`);
        }
    }
})().catch((error: Error) => {
    console.error(error);
    process.exit(1);
});
