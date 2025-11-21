#!/usr/bin/env python3

import argparse
import sys
import os
import subprocess
import shutil


def color_text(text, color_code):
    """Wraps text in ANSI color codes."""
    return f"\033[{color_code}m{text}\033[0m"


def green(text):
    """Returns green colored text for the terminal."""
    return color_text(text, "92")


def red(text):
    """Returns red colored text for the terminal."""
    return color_text(text, "91")


def grey(text):
    """Returns grey colored text for the terminal."""
    return color_text(text, "90")


def main(argv):
    parser = argparse.ArgumentParser(
        description="Synchronizes file changes from a source to a destination repository. Uses 'git diff' to determine which files to copy or delete."
    )
    parser.add_argument(
        "--source-repo", help="The path to the source repository.", required=True
    )
    parser.add_argument(
        "--destination-directory",
        help="The path to the destination directory.",
        required=True,
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="The base branch for 'git diff' to determine changes. (default: main)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable detailed output of file operations.",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Automatically answer yes to confirmation prompts.",
    )

    if not argv:
        parser.print_help()
        sys.exit(0)

    args = parser.parse_args(argv)

    source_repo = os.path.abspath(args.source_repo)
    destination_directory = os.path.abspath(args.destination_directory)

    print(f"Source repository: {source_repo}")
    print(f"Destination directory: {destination_directory}")

    # Check if source_repo is a git repository
    if not os.path.isdir(os.path.join(source_repo, ".git")):
        print(f"Error: {source_repo} is not a git repository.")
        sys.exit(1)

    # Make sure the current branch and base-branch are up to date.
    print("Updating branches...")
    try:
        # Get current branch name
        current_branch_result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=source_repo,
            capture_output=True,
            text=True,
            check=True,
        )
        current_branch = current_branch_result.stdout.strip()

        # Update the current branch
        print(f"Pulling latest changes for current branch '{current_branch}'...")
        subprocess.run(
            ["git", "pull"], cwd=source_repo, check=True, capture_output=True, text=True
        )

        # If base branch is different, update it too
        if current_branch != args.base_branch:
            print(f"Checking out and updating base branch '{args.base_branch}'...")
            # Checkout and pull base branch
            subprocess.run(
                ["git", "checkout", args.base_branch],
                cwd=source_repo,
                check=True,
                capture_output=True,
                text=True,
            )
            subprocess.run(
                ["git", "pull"],
                cwd=source_repo,
                check=True,
                capture_output=True,
                text=True,
            )

            # Go back to the original branch
            print(f"Checking out original branch '{current_branch}'...")
            subprocess.run(
                ["git", "checkout", current_branch],
                cwd=source_repo,
                check=True,
                capture_output=True,
                text=True,
            )

        print("Branches updated successfully.")

    except subprocess.CalledProcessError as e:
        print(f"Error updating git branches: {e}")
        print("Command output:")
        print(e.stdout)
        print("Command error:")
        print(e.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: 'git' command not found. Is git installed and in your PATH?")
        sys.exit(1)

    git_diff_command = ["git", "diff", args.base_branch, "--name-status"]
    result = subprocess.run(
        git_diff_command, cwd=source_repo, capture_output=True, text=True
    )

    if result.returncode != 0:
        print(f"Error running git diff against branch '{args.base_branch}':")
        print(result.stderr)
        sys.exit(1)

    diff_output = result.stdout.strip().split("\n") if result.stdout else []
    operations = []
    for line in diff_output:
        if not line:
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith("R"):
            # Renamed file: R<score>    old_path    new_path
            old_path = parts[1]
            new_path = parts[2]
            operations.append(("delete", old_path))
            operations.append(("copy", new_path))
        else:
            # Added (A), Modified (M), Deleted (D)
            path = parts[1]
            if status in ("A", "M"):
                operations.append(("copy", path))
            elif status == "D":
                operations.append(("delete", path))

    if not operations:
        print("No changed files found.")
    else:
        files_to_copy = sum(1 for op, _ in operations if op == "copy")
        files_to_delete = sum(1 for op, _ in operations if op == "delete")

        print("Summary of pending operations:")
        print(green(f"  - To be copied: {files_to_copy} file(s)"))
        print(red(f"  - To be deleted: {files_to_delete} file(s)"))

        if not args.yes:
            proceed = input(
                "Do you want to proceed with these operations? (y/n): "
            ).lower()
            if proceed != "y":
                print("Operation cancelled by user.")
                sys.exit(0)

        print("Performing file operations...")
        copy_success, copy_fail, delete_success, delete_fail, delete_skipped = (
            0,
            0,
            0,
            0,
            0,
        )

        for op, path in operations:
            source_path = os.path.join(source_repo, path)
            destination_path = os.path.join(destination_directory, path)

            if op == "copy":
                if not os.path.exists(source_path):
                    print(
                        f"Warning: Source file for copy does not exist, skipping: {source_path}"
                    )
                    copy_fail += 1
                    continue

                if args.verbose:
                    print(f"Copying: {path}")
                try:
                    # Ensure destination directory exists
                    os.makedirs(os.path.dirname(destination_path), exist_ok=True)
                    shutil.copy2(source_path, destination_path)
                    copy_success += 1
                except Exception as e:
                    print(f"Error copying {path}: {e}")
                    copy_fail += 1

            elif op == "delete":
                if os.path.isfile(destination_path):
                    if args.verbose:
                        print(f"Deleting: {path}")
                    try:
                        os.remove(destination_path)
                        delete_success += 1
                        # Clean up empty parent directories
                        try:
                            os.removedirs(os.path.dirname(destination_path))
                        except OSError:
                            # This will fail if the directory is not empty, which is expected.
                            pass
                    except Exception as e:
                        print(f"Error deleting {path}: {e}")
                        delete_fail += 1
                else:
                    if args.verbose:
                        print(
                            f"Info: File to delete already gone, skipping: {destination_path}"
                        )
                    delete_skipped += 1

        print("Synchronization complete.")
        print(green(f"  - Copied: {copy_success}"))
        if copy_fail > 0:
            print(red(f"  - Copy Failed: {copy_fail}"))
        print(red(f"  - Deleted: {delete_success}"))
        if delete_fail > 0:
            print(red(f"  - Delete Failed: {delete_fail}"))
        if delete_skipped > 0:
            print(grey(f"  - Delete Skipped (already gone): {delete_skipped}"))


if __name__ == "__main__":
    main(sys.argv[1:])
