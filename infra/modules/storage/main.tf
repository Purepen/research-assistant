# S3 bucket for uploads. NOT wired into the running backend yet for this v1
# deploy (STORAGE_TYPE stays "local" — see infra/README.md for why: the app's
# S3 code path still needs the download-to-tmp plumbing from roadmap.md WS1.4
# before pipeline consumers can actually read an uploaded file back from S3).
# Bucket exists now so that follow-up work has nothing left to provision.

resource "aws_s3_bucket" "uploads" {
  bucket        = "${var.name_prefix}-uploads"
  force_destroy = true # v1 showcase — lets `terraform destroy` remove the bucket even if it holds objects
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
