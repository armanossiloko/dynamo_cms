#!/usr/bin/env python3
"""Rename *.component.ts -> *.ts and strip Component suffix from class names."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

# Angular component classes only (longest names first)
COMPONENT_CLASSES = sorted(
    [
        "GraphQLPlaygroundComponent",
        "GraphQLVoyagerComponent",
        "SingleTypeBuilderComponent",
        "SingleTypeEditorComponent",
        "SingleTypesListComponent",
        "CollectionFormComponent",
        "CollectionsListComponent",
        "ComponentsAdminComponent",
        "RichTextEditorComponent",
        "MediaFileEditComponent",
        "MediaLibraryComponent",
        "LocaleSelectorComponent",
        "SwaggerViewerComponent",
        "WebhooksAdminComponent",
        "VersionsAdminComponent",
        "ApiKeysListComponent",
        "DynamicZoneComponent",
        "FileUploadComponent",
        "SwaggerUIComponent",
        "CmsAvatarComponent",
        "DataTableComponent",
        "UserDetailComponent",
        "UsersListComponent",
        "DataFormComponent",
        "DataListComponent",
        "CmsIconComponent",
        "ApiDocsComponent",
        "RegisterComponent",
        "ModalComponent",
        "LoginComponent",
        "HomeComponent",
        "PageAComponent",
        "PageBComponent",
    ],
    key=len,
    reverse=True,
)

CLASS_RENAMES = {name: name.removesuffix("Component") for name in COMPONENT_CLASSES}


def rename_class_references(text: str) -> str:
    for old, new in CLASS_RENAMES.items():
        text = re.sub(rf"\b{re.escape(old)}\b", new, text)
    return text


def fix_import_paths(text: str) -> str:
    return re.sub(r"\.component(?=['\"])", "", text)


def process_file(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    updated = fix_import_paths(rename_class_references(text))
    if updated != text:
        path.write_text(updated, encoding="utf-8")


def main() -> None:
    component_files = sorted(SRC.rglob("*.component.ts"))
    print(f"Found {len(component_files)} component files")

    # Rename files (deepest paths first to avoid conflicts)
    moves: list[tuple[Path, Path]] = []
    for old in component_files:
        new = old.with_name(old.name.replace(".component.ts", ".ts"))
        if new.exists():
            raise SystemExit(f"Target already exists: {new}")
        moves.append((old, new))

    for old, new in moves:
        shutil.move(str(old), str(new))
        print(f"  {old.relative_to(ROOT)} -> {new.name}")

    # Update all TypeScript sources
    for ts in SRC.rglob("*.ts"):
        process_file(ts)

    # Update HTML if any component refs (unlikely)
    for html in SRC.rglob("*.html"):
        text = html.read_text(encoding="utf-8")
        updated = fix_import_paths(rename_class_references(text))
        if updated != text:
            html.write_text(updated, encoding="utf-8")

    print("Done.")


if __name__ == "__main__":
    main()
