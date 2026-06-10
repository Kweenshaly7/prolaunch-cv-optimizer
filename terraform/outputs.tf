output "frontend_url" {
  description = "The CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend_distribution.domain_name
}

output "api_endpoint" {
  description = "The API Gateway HTTP endpoint"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "s3_bucket_name" {
  description = "The S3 bucket for frontend files"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "The CloudFront Distribution ID (for invalidation)"
  value       = aws_cloudfront_distribution.frontend_distribution.id
}
